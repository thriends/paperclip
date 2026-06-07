import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { GraphNode, EdgeType, MemoryType } from "../types.js";
import { extractWikilinks, extractIssueIds } from "../edge-extraction.js";

export interface OutgoingEdge {
  sourceId: string;
  targetRef: string;
  type: EdgeType;
}

export interface DataSourceResult {
  nodes: GraphNode[];
  outgoingEdges: OutgoingEdge[];
}

function parseFrontmatter(content: string): { name?: string; type?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const body = match[1];
  const nameMatch = body.match(/^name:\s*(\S+)\s*$/m);
  const typeMatch = body.match(/^\s+type:\s*(\S+)\s*$/m);
  return {
    name: nameMatch ? nameMatch[1] : undefined,
    type: typeMatch ? typeMatch[1] : undefined,
  };
}

const VALID_MEMORY_TYPES: readonly MemoryType[] = [
  "project",
  "feedback",
  "user",
  "reference",
];

function toMemoryType(type: string | undefined): MemoryType | undefined {
  if (!type) return undefined;
  return (VALID_MEMORY_TYPES as readonly string[]).includes(type)
    ? (type as MemoryType)
    : undefined;
}

export async function scanMemory(memoryDir: string): Promise<DataSourceResult> {
  const nodes: GraphNode[] = [];
  const outgoingEdges: OutgoingEdge[] = [];

  let entries: string[];
  try {
    entries = await fs.readdir(memoryDir);
  } catch {
    return { nodes, outgoingEdges };
  }

  for (const entry of entries) {
    if (!entry.endsWith(".md") || entry === "MEMORY.md") continue;
    const filePath = path.join(memoryDir, entry);
    let content: string;
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch {
      continue;
    }
    const { name, type } = parseFrontmatter(content);
    if (!name) continue;

    const memoryType = toMemoryType(type);

    const nodeId = `memory:${name}`;
    nodes.push({
      id: nodeId,
      type: "memory",
      label: name,
      metadata: {
        path: filePath,
        memoryType,
      },
    });

    const body = content.replace(/^---[\s\S]*?---/, "");
    for (const ref of extractWikilinks(body)) {
      outgoingEdges.push({ sourceId: nodeId, targetRef: ref, type: "wikilink" });
    }
    for (const issueId of extractIssueIds(body)) {
      outgoingEdges.push({ sourceId: nodeId, targetRef: issueId, type: "issue-mention" });
    }
  }

  return { nodes, outgoingEdges };
}
