import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { GraphNode } from "../types.js";
import { extractIssueIds, extractFilePaths } from "../edge-extraction.js";
import type { DataSourceResult, OutgoingEdge } from "./memory.js";

export async function scanSouls(soulsDir: string): Promise<DataSourceResult> {
  const nodes: GraphNode[] = [];
  const outgoingEdges: OutgoingEdge[] = [];

  let companyDirs: string[];
  try {
    companyDirs = await fs.readdir(soulsDir);
  } catch {
    return { nodes, outgoingEdges };
  }

  for (const company of companyDirs) {
    const companyPath = path.join(soulsDir, company);
    let stat;
    try {
      stat = await fs.stat(companyPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    let files: string[];
    try {
      files = await fs.readdir(companyPath);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(companyPath, file);
      let content: string;
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        continue;
      }
      const slug = file.replace(/\.md$/, "");
      const nodeId = `soul:${company}/${slug}`;
      nodes.push({
        id: nodeId,
        type: "soul",
        label: `${company}/${slug}`,
        metadata: { path: filePath, company },
      });
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
