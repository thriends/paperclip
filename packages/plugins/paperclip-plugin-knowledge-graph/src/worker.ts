import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { homedir } from "node:os";
import * as path from "node:path";
import { scanMemory, type DataSourceResult } from "./data-sources/memory.js";
import { scanDocs } from "./data-sources/docs.js";
import { scanSouls } from "./data-sources/souls.js";
import { buildGraph } from "./graph-builder.js";
import {
  extractWikilinks,
  extractIssueIds,
  extractFilePaths,
} from "./edge-extraction.js";
import type { GraphData, GraphNode, IssueStatus } from "./types.js";
import type { PluginContext } from "@paperclipai/plugin-sdk";

// ---------------------------------------------------------------------------
// Filesystem locations the worker scans
// ---------------------------------------------------------------------------

const MEMORY_DIR = path.join(
  homedir(),
  ".claude",
  "projects",
  "-Users-martinzielinski-Library-CloudStorage-GoogleDrive-martin-noorder-partners-Geteilte-Ablagen-01-Areas-Autopilot-ventures-PAIA",
  "memory",
);

const DOCS_DIR = path.join(homedir(), "PAI", "docs", "superpowers");
const SOULS_DIR = path.join(homedir(), "PAI", "souls");

const POLLING_INTERVAL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// In-RAM cache
// ---------------------------------------------------------------------------

interface WorkerCache {
  data: GraphData | null;
  lastBuiltAt: number;
  lastError: string | null;
}

const cache: WorkerCache = { data: null, lastBuiltAt: 0, lastError: null };

const VALID_ISSUE_STATUSES: readonly IssueStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "in_review",
  "done",
  "cancelled",
];

/**
 * SDK-backed equivalent of `fetchIssues` from `data-sources/issues.ts`.
 *
 * The T6 `fetchIssues` helper takes (apiBase, token) and hits the raw HTTP
 * surface — that lets the data-source be unit-tested with `vi.fn()` against
 * `global.fetch`. Inside the worker we have the full SDK client available,
 * so we use `ctx.companies.list()` + `ctx.issues.list()` instead, which
 * respects capability gates and avoids needing an out-of-band API token.
 *
 * The produced `DataSourceResult` shape matches `fetchIssues` exactly, so
 * downstream `buildGraph` sees an identical input regardless of source.
 */
async function scanIssuesViaSdk(
  ctx: PluginContext,
): Promise<DataSourceResult> {
  const nodes: GraphNode[] = [];
  const outgoingEdges: DataSourceResult["outgoingEdges"] = [];

  let companies;
  try {
    companies = await ctx.companies.list({ limit: 50 });
  } catch (err) {
    ctx.logger.warn("scanIssuesViaSdk: companies.list failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { nodes, outgoingEdges };
  }

  const idToIdentifier = new Map<string, string>();
  const allIssues: Array<{
    id: string;
    identifier: string;
    status: string;
    description: string | null;
    parentId: string | null;
    companyId: string;
  }> = [];

  for (const company of companies) {
    let issues;
    try {
      issues = await ctx.issues.list({ companyId: company.id, limit: 500 });
    } catch (err) {
      ctx.logger.warn("scanIssuesViaSdk: issues.list failed", {
        companyId: company.id,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    for (const issue of issues) {
      if (!issue.identifier) continue; // skip issues without an identifier
      idToIdentifier.set(issue.id, issue.identifier);
      allIssues.push({
        id: issue.id,
        identifier: issue.identifier,
        status: issue.status,
        description: issue.description ?? null,
        parentId: issue.parentId ?? null,
        companyId: issue.companyId,
      });
    }
  }

  for (const issue of allIssues) {
    const status = (VALID_ISSUE_STATUSES as readonly string[]).includes(issue.status)
      ? (issue.status as IssueStatus)
      : undefined;
    const prefix = issue.identifier.split("-")[0];
    const nodeId = `issue:${issue.identifier}`;

    nodes.push({
      id: nodeId,
      type: "issue",
      label: issue.identifier,
      metadata: {
        company: prefix,
        issueStatus: status,
      },
    });

    if (issue.parentId) {
      const parentIdentifier = idToIdentifier.get(issue.parentId);
      if (parentIdentifier) {
        outgoingEdges.push({
          sourceId: nodeId,
          targetRef: `issue:${parentIdentifier}`,
          type: "parent-child",
        });
      }
    }

    const desc = issue.description ?? "";
    for (const ref of extractWikilinks(desc)) {
      outgoingEdges.push({ sourceId: nodeId, targetRef: ref, type: "wikilink" });
    }
    for (const issueId of extractIssueIds(desc)) {
      if (issueId !== issue.identifier) {
        outgoingEdges.push({
          sourceId: nodeId,
          targetRef: issueId,
          type: "issue-mention",
        });
      }
    }
    for (const pathRef of extractFilePaths(desc)) {
      outgoingEdges.push({ sourceId: nodeId, targetRef: pathRef, type: "file-path" });
    }
  }

  return { nodes, outgoingEdges };
}

async function rebuildGraph(ctx: PluginContext): Promise<GraphData> {
  const t0 = Date.now();
  const [memoryResult, docsResult, soulsResult, issuesResult] = await Promise.all([
    scanMemory(MEMORY_DIR).catch((err) => {
      ctx.logger.warn("scanMemory failed", { error: String(err) });
      return { nodes: [], outgoingEdges: [] } satisfies DataSourceResult;
    }),
    scanDocs(DOCS_DIR).catch((err) => {
      ctx.logger.warn("scanDocs failed", { error: String(err) });
      return { nodes: [], outgoingEdges: [] } satisfies DataSourceResult;
    }),
    scanSouls(SOULS_DIR).catch((err) => {
      ctx.logger.warn("scanSouls failed", { error: String(err) });
      return { nodes: [], outgoingEdges: [] } satisfies DataSourceResult;
    }),
    scanIssuesViaSdk(ctx),
  ]);

  const allNodes = [
    ...memoryResult.nodes,
    ...docsResult.nodes,
    ...soulsResult.nodes,
    ...issuesResult.nodes,
  ];
  const allOutgoing = [
    ...memoryResult.outgoingEdges,
    ...docsResult.outgoingEdges,
    ...soulsResult.outgoingEdges,
    ...issuesResult.outgoingEdges,
  ];

  const graph = buildGraph({ allNodes, allOutgoing });
  cache.data = graph;
  cache.lastBuiltAt = Date.now();
  cache.lastError = null;

  ctx.logger.info("knowledge-graph rebuilt", {
    durationMs: cache.lastBuiltAt - t0,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    memory: graph.stats.memoryCount,
    docs: graph.stats.docCount,
    souls: graph.stats.soulCount,
    issues: graph.stats.issueCount,
    deadLinks: graph.stats.deadLinkCount,
  });

  return graph;
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("knowledge-graph plugin setup", {
      memoryDir: MEMORY_DIR,
      docsDir: DOCS_DIR,
      soulsDir: SOULS_DIR,
      pollingIntervalMs: POLLING_INTERVAL_MS,
    });

    // Initial build — kicked off in the background so setup() returns quickly.
    // The UI's first `usePluginData("graph-data")` call will either get cached
    // data, or fall through to an on-demand rebuild via the handler below.
    void rebuildGraph(ctx).catch((err) => {
      cache.lastError = err instanceof Error ? err.message : String(err);
      ctx.logger.error("initial knowledge-graph build failed", {
        error: cache.lastError,
      });
    });

    // Periodic refresh every 5 minutes.
    const interval = setInterval(() => {
      void rebuildGraph(ctx).catch((err) => {
        cache.lastError = err instanceof Error ? err.message : String(err);
        ctx.logger.error("periodic knowledge-graph rebuild failed", {
          error: cache.lastError,
        });
      });
    }, POLLING_INTERVAL_MS);
    // Allow process to exit cleanly during host shutdown.
    if (typeof interval === "object" && interval !== null && "unref" in interval) {
      (interval as { unref: () => void }).unref();
    }

    // Data handler — read-side. Equivalent to `GET /data` in the original plan.
    // The UI's `usePluginData("graph-data")` hook routes through here.
    ctx.data.register("graph-data", async () => {
      if (cache.data) {
        return {
          data: cache.data,
          lastBuiltAt: new Date(cache.lastBuiltAt).toISOString(),
          fromCache: true,
          error: cache.lastError,
        };
      }
      // No cache yet — build on demand.
      const graph = await rebuildGraph(ctx);
      return {
        data: graph,
        lastBuiltAt: new Date(cache.lastBuiltAt).toISOString(),
        fromCache: false,
        error: cache.lastError,
      };
    });

    // Action handler — write-side. Equivalent to `POST /refresh` in the
    // original plan. The UI's `usePluginAction("graph-refresh")` triggers a
    // forced rebuild and returns the fresh data.
    ctx.actions.register("graph-refresh", async () => {
      const graph = await rebuildGraph(ctx);
      return {
        data: graph,
        lastBuiltAt: new Date(cache.lastBuiltAt).toISOString(),
        fromCache: false,
        error: cache.lastError,
      };
    });
  },

  async onHealth() {
    if (cache.lastError) {
      return {
        status: "degraded",
        message: `last rebuild failed: ${cache.lastError}`,
      };
    }
    if (!cache.data) {
      return { status: "degraded", message: "initial scan in progress" };
    }
    const ageMs = Date.now() - cache.lastBuiltAt;
    return {
      status: "ok",
      message: `cache age ${Math.round(ageMs / 1000)}s, ${cache.data.nodes.length} nodes, ${cache.data.edges.length} edges`,
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
