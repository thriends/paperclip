import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { GraphNode } from "../types.js";
import {
  extractWikilinks,
  extractIssueIds,
  extractFilePaths,
} from "../edge-extraction.js";
import type { DataSourceResult, OutgoingEdge } from "./memory.js";

const SUBFOLDERS = ["specs", "plans", "notes"];

export async function scanDocs(docsDir: string): Promise<DataSourceResult> {
  const nodes: GraphNode[] = [];
  const outgoingEdges: OutgoingEdge[] = [];

  for (const sub of SUBFOLDERS) {
    const dir = path.join(docsDir, sub);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const filePath = path.join(dir, entry);
      let content: string;
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        continue;
      }
      const slug = entry.replace(/\.md$/, "");
      const nodeId = `doc:${slug}`;
      nodes.push({
        id: nodeId,
        type: "doc",
        label: slug,
        metadata: { path: filePath },
      });
      for (const ref of extractWikilinks(content)) {
        outgoingEdges.push({ sourceId: nodeId, targetRef: ref, type: "wikilink" });
      }
      for (const issueId of extractIssueIds(content)) {
        outgoingEdges.push({ sourceId: nodeId, targetRef: issueId, type: "issue-mention" });
      }
      for (const pathRef of extractFilePaths(content)) {
        outgoingEdges.push({ sourceId: nodeId, targetRef: pathRef, type: "file-path" });
      }
    }
  }

  return { nodes, outgoingEdges };
}

export type { DataSourceResult, OutgoingEdge };
