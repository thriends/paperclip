import { useEffect, useRef } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import type { GraphData, GraphNode } from "../types.js";

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
  filter?: (node: GraphNode) => boolean;
  height?: string | number;
  topN?: number;
}

const TYPE_COLORS: Record<string, string> = {
  memory: "#4a90e2",
  doc: "#9b59b6",
  soul: "#e67e22",
  issue: "#27ae60",
};

const STATUS_COLORS: Partial<Record<string, string>> = {
  blocked: "#c0392b",
  done: "#7f8c8d",
};

function nodeColor(node: GraphNode): string {
  if (node.type === "issue" && node.metadata.issueStatus) {
    const statusColor = STATUS_COLORS[node.metadata.issueStatus];
    if (statusColor) return statusColor;
  }
  if (node.id.startsWith("dead:")) return "#bdc3c7";
  return TYPE_COLORS[node.type] ?? "#95a5a6";
}

export function GraphCanvas(props: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let nodes = props.data.nodes;
    if (props.filter) {
      nodes = nodes.filter(props.filter);
    }

    // Top-N: Edge-Count pro Node
    if (props.topN && props.topN > 0) {
      const edgeCount = new Map<string, number>();
      for (const e of props.data.edges) {
        edgeCount.set(e.source, (edgeCount.get(e.source) ?? 0) + 1);
        edgeCount.set(e.target, (edgeCount.get(e.target) ?? 0) + 1);
      }
      const sorted = [...nodes].sort(
        (a, b) => (edgeCount.get(b.id) ?? 0) - (edgeCount.get(a.id) ?? 0),
      );
      nodes = sorted.slice(0, props.topN);
    }

    const visibleIds = new Set(nodes.map((n) => n.id));
    const edges = props.data.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
    );

    const visNodes = new DataSet(
      nodes.map((n) => ({
        id: n.id,
        label: n.label,
        color: nodeColor(n),
        shape: n.type === "issue" ? "dot" : "box",
      })),
    );
    const visEdges = new DataSet(
      edges.map((e, i) => ({
        id: `e${i}`,
        from: e.source,
        to: e.target,
        width: Math.min(e.weight, 5),
        dashes: e.target.startsWith("dead:"),
        color: { color: "#bdc3c7", opacity: 0.6 },
      })),
    );

    const options = {
      physics: {
        enabled: true,
        stabilization: { iterations: 100 },
      },
      interaction: { hover: true, zoomView: true },
      nodes: {
        font: { color: "#ecf0f1", size: 12 },
        borderWidth: 0,
      },
    };

    networkRef.current = new Network(
      containerRef.current,
      { nodes: visNodes, edges: visEdges },
      options,
    );

    if (props.onNodeClick) {
      networkRef.current.on("click", (params) => {
        if (params.nodes.length > 0) {
          props.onNodeClick?.(params.nodes[0] as string);
        }
      });
    }

    networkRef.current.once("stabilizationIterationsDone", () => {
      networkRef.current?.setOptions({ physics: { enabled: false } });
    });

    return () => {
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, [props.data, props.filter, props.topN, props.onNodeClick]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: props.height ?? "100%",
        background: "var(--color-bg, #1a1a1a)",
      }}
    />
  );
}
