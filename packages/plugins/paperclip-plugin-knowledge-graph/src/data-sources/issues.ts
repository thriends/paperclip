import type { GraphNode, IssueStatus } from "../types.js";
import {
  extractWikilinks,
  extractIssueIds,
  extractFilePaths,
} from "../edge-extraction.js";
import type { DataSourceResult, OutgoingEdge } from "./memory.js";

interface CompanyApi {
  id: string;
  issuePrefix: string;
  name?: string;
}

interface IssueApi {
  id: string;
  identifier: string;
  title?: string;
  status: string;
  description?: string;
  parentId?: string | null;
  companyId: string;
}

interface CommentApi {
  id: string;
  body?: string;
  issueId: string;
}

const VALID_STATUSES: IssueStatus[] = [
  "todo", "in_progress", "blocked", "in_review", "done", "cancelled",
];

async function safeJson<T>(url: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchIssues(
  apiBase: string,
  token: string,
): Promise<DataSourceResult> {
  const nodes: GraphNode[] = [];
  const outgoingEdges: OutgoingEdge[] = [];

  const companies = await safeJson<CompanyApi[]>(`${apiBase}/api/companies`, token);
  if (!companies) return { nodes, outgoingEdges };

  const idToIdentifier = new Map<string, string>();
  const allIssues: IssueApi[] = [];
  for (const company of companies) {
    const issues = await safeJson<IssueApi[]>(
      `${apiBase}/api/companies/${company.id}/issues?limit=500`,
      token,
    );
    if (!issues) continue;
    for (const issue of issues) {
      idToIdentifier.set(issue.id, issue.identifier);
      allIssues.push(issue);
    }
  }

  for (const issue of allIssues) {
    const status = (VALID_STATUSES as readonly string[]).includes(issue.status)
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
        outgoingEdges.push({ sourceId: nodeId, targetRef: issueId, type: "issue-mention" });
      }
    }
    for (const pathRef of extractFilePaths(desc)) {
      outgoingEdges.push({ sourceId: nodeId, targetRef: pathRef, type: "file-path" });
    }

    const comments = await safeJson<CommentApi[]>(
      `${apiBase}/api/issues/${issue.id}/comments`,
      token,
    );
    if (comments) {
      for (const comment of comments) {
        const body = comment.body ?? "";
        for (const issueId of extractIssueIds(body)) {
          if (issueId !== issue.identifier) {
            outgoingEdges.push({ sourceId: nodeId, targetRef: issueId, type: "issue-mention" });
          }
        }
        for (const ref of extractWikilinks(body)) {
          outgoingEdges.push({ sourceId: nodeId, targetRef: ref, type: "wikilink" });
        }
      }
    }
  }

  return { nodes, outgoingEdges };
}
