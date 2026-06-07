import { useState, useCallback, useMemo } from "react";
import type { PluginPageProps } from "@paperclipai/plugin-sdk/ui";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
import { GraphCanvas } from "./graph-canvas.js";
import { FilterSidebar, type FilterState } from "./filter-sidebar.js";
import { DetailPanel } from "./detail-panel.js";
import type { GraphData, GraphNode, NodeType, MemoryType } from "../types.js";

interface GraphDataResponse {
  data: GraphData | null;
  lastBuiltAt: string;
  fromCache: boolean;
  error: string | null;
}

export function FullPageRoute(_props: PluginPageProps) {
  const { data, loading, error, refresh } = usePluginData<GraphDataResponse>("graph-data");
  const triggerRefresh = usePluginAction("graph-refresh");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    sources: new Set<NodeType>(["memory", "doc", "soul", "issue"]),
    memoryTypes: new Set<MemoryType>(["project", "feedback", "user", "reference"]),
    companies: new Set<string>(),
    search: "",
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await triggerRefresh();
      refresh();
    } finally {
      setRefreshing(false);
    }
  }, [triggerRefresh, refresh]);

  const graphData = data?.data ?? null;

  const availableCompanies = useMemo(() => {
    if (!graphData) return [];
    return Array.from(
      new Set(
        graphData.nodes
          .map((n) => n.metadata.company)
          .filter((c): c is string => !!c),
      ),
    ).sort();
  }, [graphData]);

  const nodeFilter = useCallback(
    (n: GraphNode): boolean => {
      // Dead-link placeholders are always shown so dangling refs stay visible.
      if (n.id.startsWith("dead:")) return true;
      if (!filter.sources.has(n.type)) return false;
      if (
        n.type === "memory" &&
        n.metadata.memoryType &&
        !filter.memoryTypes.has(n.metadata.memoryType)
      ) {
        return false;
      }
      if (
        filter.companies.size > 0 &&
        n.metadata.company &&
        !filter.companies.has(n.metadata.company)
      ) {
        return false;
      }
      if (
        filter.search &&
        !n.label.toLowerCase().includes(filter.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    },
    [filter],
  );

  if (loading && !graphData) {
    return <div style={{ padding: 24, opacity: 0.6 }}>Knowledge-Graph laedt…</div>;
  }
  if (error) {
    return (
      <div style={{ padding: 24, color: "var(--color-error, #c0392b)" }}>
        Fehler beim Laden: {error.message}
      </div>
    );
  }
  if (!data || !graphData) {
    return <div style={{ padding: 24, opacity: 0.6 }}>Noch keine Graph-Daten.</div>;
  }
  if (data.error) {
    return (
      <div style={{ padding: 24, color: "var(--color-error, #c0392b)" }}>
        Worker-Fehler: {data.error}
      </div>
    );
  }

  const stats = {
    memory: graphData.stats.memoryCount,
    docs: graphData.stats.docCount,
    souls: graphData.stats.soulCount,
    issues: graphData.stats.issueCount,
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--color-bg, #1a1a1a)",
        color: "var(--color-fg, #ecf0f1)",
      }}
    >
      <FilterSidebar
        filter={filter}
        onChange={setFilter}
        stats={stats}
        availableCompanies={availableCompanies}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
        <GraphCanvas data={graphData} filter={nodeFilter} onNodeClick={setSelectedNodeId} />
      </div>
      <DetailPanel selectedNodeId={selectedNodeId} data={graphData} />
    </div>
  );
}
