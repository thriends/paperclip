import { describe, it, expect } from "vitest";
import { buildGraph } from "../src/graph-builder.js";
import type { GraphNode } from "../src/types.js";
import type { OutgoingEdge } from "../src/data-sources/memory.js";

describe("buildGraph", () => {
  it("resolves wikilink edges by node label", () => {
    const nodes: GraphNode[] = [
      { id: "memory:a", type: "memory", label: "a", metadata: {} },
      { id: "memory:b", type: "memory", label: "b", metadata: {} },
    ];
    const outgoing: OutgoingEdge[] = [
      { sourceId: "memory:a", targetRef: "b", type: "wikilink" },
    ];
    const result = buildGraph({ allNodes: nodes, allOutgoing: outgoing });
    expect(result.edges).toContainEqual({
      source: "memory:a",
      target: "memory:b",
      type: "wikilink",
      weight: 1,
    });
  });

  it("resolves issue-mention edges by issue prefix", () => {
    const nodes: GraphNode[] = [
      { id: "memory:a", type: "memory", label: "a", metadata: {} },
      { id: "issue:AUTP-56", type: "issue", label: "AUTP-56", metadata: { company: "AUTP" } },
    ];
    const outgoing: OutgoingEdge[] = [
      { sourceId: "memory:a", targetRef: "AUTP-56", type: "issue-mention" },
    ];
    const result = buildGraph({ allNodes: nodes, allOutgoing: outgoing });
    expect(result.edges).toContainEqual({
      source: "memory:a",
      target: "issue:AUTP-56",
      type: "issue-mention",
      weight: 1,
    });
  });

  it("creates dead-link node + dashed edge for unresolved wikilinks", () => {
    const nodes: GraphNode[] = [
      { id: "memory:a", type: "memory", label: "a", metadata: {} },
    ];
    const outgoing: OutgoingEdge[] = [
      { sourceId: "memory:a", targetRef: "missing-target", type: "wikilink" },
    ];
    const result = buildGraph({ allNodes: nodes, allOutgoing: outgoing });
    expect(result.nodes.find((n) => n.label === "Dead-Link: missing-target")).toBeDefined();
    expect(result.stats.deadLinkCount).toBe(1);
  });

  it("aggregates weight when multiple edges between same nodes", () => {
    const nodes: GraphNode[] = [
      { id: "memory:a", type: "memory", label: "a", metadata: {} },
      { id: "memory:b", type: "memory", label: "b", metadata: {} },
    ];
    const outgoing: OutgoingEdge[] = [
      { sourceId: "memory:a", targetRef: "b", type: "wikilink" },
      { sourceId: "memory:a", targetRef: "b", type: "wikilink" },
      { sourceId: "memory:a", targetRef: "b", type: "wikilink" },
    ];
    const result = buildGraph({ allNodes: nodes, allOutgoing: outgoing });
    const edge = result.edges.find((e) => e.source === "memory:a" && e.target === "memory:b");
    expect(edge?.weight).toBe(3);
  });

  it("resolves file-path edges by matching node.metadata.path", () => {
    const nodes: GraphNode[] = [
      { id: "doc:foo", type: "doc", label: "foo", metadata: { path: "/Users/martinzielinski/PAI/souls/AUTV/cos.md" } },
      { id: "soul:AUTV/cos", type: "soul", label: "AUTV/cos", metadata: { path: "/Users/martinzielinski/PAI/souls/AUTV/cos.md" } },
    ];
    const outgoing: OutgoingEdge[] = [
      { sourceId: "doc:foo", targetRef: "~/PAI/souls/AUTV/cos.md", type: "file-path" },
    ];
    const result = buildGraph({ allNodes: nodes, allOutgoing: outgoing });
    expect(result.edges).toContainEqual({
      source: "doc:foo",
      target: "soul:AUTV/cos",
      type: "file-path",
      weight: 1,
    });
  });

  it("populates stats", () => {
    const nodes: GraphNode[] = [
      { id: "memory:a", type: "memory", label: "a", metadata: {} },
      { id: "doc:b", type: "doc", label: "b", metadata: {} },
      { id: "soul:c", type: "soul", label: "c", metadata: {} },
      { id: "issue:AUTP-1", type: "issue", label: "AUTP-1", metadata: {} },
    ];
    const outgoing: OutgoingEdge[] = [
      { sourceId: "memory:a", targetRef: "b", type: "wikilink" },
    ];
    const result = buildGraph({ allNodes: nodes, allOutgoing: outgoing });
    expect(result.stats).toMatchObject({
      memoryCount: 1,
      docCount: 1,
      soulCount: 1,
      issueCount: 1,
      edgeCount: 1,
      deadLinkCount: 0,
    });
  });
});
