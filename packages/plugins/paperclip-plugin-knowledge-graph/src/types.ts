export type NodeType = "memory" | "doc" | "soul" | "issue";

export type EdgeType = "wikilink" | "issue-mention" | "parent-child" | "file-path";

export type MemoryType = "project" | "feedback" | "user" | "reference";

export type IssueStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "in_review"
  | "done"
  | "cancelled";

export interface NodeMetadata {
  path?: string;
  issueStatus?: IssueStatus;
  company?: string;
  memoryType?: MemoryType;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  metadata: NodeMetadata;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  generatedAt: string;
  stats: {
    memoryCount: number;
    docCount: number;
    soulCount: number;
    issueCount: number;
    edgeCount: number;
    deadLinkCount: number;
  };
}
