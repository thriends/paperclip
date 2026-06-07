import type { PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";
import { usePluginData, useHostNavigation } from "@paperclipai/plugin-sdk/ui";
import { GraphCanvas } from "./graph-canvas.js";
import type { GraphData } from "../types.js";

interface GraphDataResponse {
  data: GraphData | null;
  lastBuiltAt: string;
  fromCache: boolean;
  error: string | null;
}

export function MiniWidget({ context }: PluginWidgetProps) {
  const { data, loading, error } = usePluginData<GraphDataResponse>("graph-data");
  const navigation = useHostNavigation();

  if (loading) {
    return <div style={{ padding: 12, opacity: 0.6 }}>Knowledge-Graph laedt…</div>;
  }
  if (error) {
    return (
      <div style={{ padding: 12, color: "var(--color-error, #f87171)" }}>
        Knowledge-Graph konnte nicht geladen werden: {error.message}
      </div>
    );
  }
  if (!data || !data.data) {
    return <div style={{ padding: 12, opacity: 0.6 }}>Noch keine Graph-Daten.</div>;
  }
  if (data.error) {
    return (
      <div style={{ padding: 12, color: "var(--color-error, #f87171)" }}>
        Worker-Fehler: {data.error}
      </div>
    );
  }

  const graphData = data.data;
  const companyPrefix = context.companyPrefix ?? "AUTP";

  return (
    <section aria-label="Knowledge Graph (Top-50)">
      <header style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
        <strong>Knowledge Graph</strong>
        <span style={{ opacity: 0.55, fontSize: "0.85em" }}>
          Top-50 ({graphData.nodes.length} Nodes, {graphData.edges.length} Edges)
        </span>
      </header>
      <div style={{ width: "100%", height: 200 }}>
        <GraphCanvas
          data={graphData}
          topN={50}
          onNodeClick={() => {
            navigation.navigate(`/${companyPrefix}/knowledge-graph`);
          }}
        />
      </div>
    </section>
  );
}
