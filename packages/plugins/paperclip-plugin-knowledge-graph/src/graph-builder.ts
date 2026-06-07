import type { GraphNode, GraphEdge, GraphData } from "./types.js";
import type { OutgoingEdge } from "./data-sources/memory.js";

interface BuildGraphInput {
  allNodes: GraphNode[];
  allOutgoing: OutgoingEdge[];
}

function normalizeFilePath(ref: string): string {
  if (ref.startsWith("~/")) {
    return "/Users/martinzielinski/" + ref.slice(2);
  }
  return ref;
}

export function buildGraph(input: BuildGraphInput): GraphData {
  const { allNodes, allOutgoing } = input;

  const byId = new Map<string, GraphNode>(allNodes.map((n) => [n.id, n]));
  const byLabel = new Map<string, GraphNode>();
  for (const n of allNodes) {
    if (!byLabel.has(n.label)) byLabel.set(n.label, n);
  }
  const byPath = new Map<string, GraphNode>();
  for (const n of allNodes) {
    if (n.metadata.path) byPath.set(n.metadata.path, n);
  }

  const edgeMap = new Map<string, GraphEdge>();
  const deadLinks = new Map<string, GraphNode>();

  function addEdge(source: string, target: string, type: GraphEdge["type"]): void {
    const key = `${source}→${target}:${type}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight += 1;
    } else {
      edgeMap.set(key, { source, target, type, weight: 1 });
    }
  }

  function addDeadLink(ref: string): string {
    const deadId = `dead:${ref}`;
    if (!deadLinks.has(deadId)) {
      deadLinks.set(deadId, {
        id: deadId,
        type: "memory",
        label: `Dead-Link: ${ref}`,
        metadata: {},
      });
    }
    return deadId;
  }

  for (const out of allOutgoing) {
    let targetId: string | undefined;

    switch (out.type) {
      case "wikilink": {
        const target = byLabel.get(out.targetRef);
        targetId = target?.id;
        break;
      }
      case "issue-mention": {
        const issueRef = out.targetRef.startsWith("issue:")
          ? out.targetRef
          : `issue:${out.targetRef}`;
        targetId = byId.has(issueRef) ? issueRef : undefined;
        break;
      }
      case "parent-child": {
        targetId = byId.has(out.targetRef) ? out.targetRef : undefined;
        break;
      }
      case "file-path": {
        const normalized = normalizeFilePath(out.targetRef);
        const target = byPath.get(normalized);
        targetId = target?.id;
        break;
      }
    }

    if (!targetId) {
      targetId = addDeadLink(out.targetRef);
    }
    addEdge(out.sourceId, targetId, out.type);
  }

  const edges = Array.from(edgeMap.values());
  const finalNodes = [...allNodes, ...Array.from(deadLinks.values())];

  const stats = {
    memoryCount: allNodes.filter((n) => n.type === "memory").length,
    docCount: allNodes.filter((n) => n.type === "doc").length,
    soulCount: allNodes.filter((n) => n.type === "soul").length,
    issueCount: allNodes.filter((n) => n.type === "issue").length,
    edgeCount: edges.length,
    deadLinkCount: deadLinks.size,
  };

  return {
    nodes: finalNodes,
    edges,
    generatedAt: new Date().toISOString(),
    stats,
  };
}
