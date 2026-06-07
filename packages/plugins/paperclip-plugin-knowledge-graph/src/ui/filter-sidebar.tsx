import type { NodeType, MemoryType } from "../types.js";

export interface FilterState {
  sources: Set<NodeType>;
  memoryTypes: Set<MemoryType>;
  companies: Set<string>;
  search: string;
}

interface FilterSidebarProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  stats: { memory: number; docs: number; souls: number; issues: number };
  availableCompanies: string[];
  onRefresh: () => void;
  refreshing?: boolean;
}

const sourceLabels: Array<[NodeType, string]> = [
  ["memory", "Memory"],
  ["doc", "Docs"],
  ["soul", "Souls"],
  ["issue", "Issues"],
];

const memoryLabels: Array<[MemoryType, string]> = [
  ["project", "project"],
  ["feedback", "feedback"],
  ["user", "user"],
  ["reference", "reference"],
];

const sectionHeading: React.CSSProperties = {
  margin: "16px 0 8px",
  fontSize: "0.75em",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  opacity: 0.65,
  fontWeight: 500,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  margin: "4px 0",
  fontSize: "0.9em",
};

export function FilterSidebar(props: FilterSidebarProps) {
  function toggleSource(t: NodeType) {
    const next = new Set(props.filter.sources);
    if (next.has(t)) {
      next.delete(t);
    } else {
      next.add(t);
    }
    props.onChange({ ...props.filter, sources: next });
  }
  function toggleMemoryType(t: MemoryType) {
    const next = new Set(props.filter.memoryTypes);
    if (next.has(t)) {
      next.delete(t);
    } else {
      next.add(t);
    }
    props.onChange({ ...props.filter, memoryTypes: next });
  }
  function toggleCompany(c: string) {
    const next = new Set(props.filter.companies);
    if (next.has(c)) {
      next.delete(c);
    } else {
      next.add(c);
    }
    props.onChange({ ...props.filter, companies: next });
  }

  function countForType(t: NodeType): number {
    switch (t) {
      case "memory":
        return props.stats.memory;
      case "doc":
        return props.stats.docs;
      case "soul":
        return props.stats.souls;
      case "issue":
        return props.stats.issues;
    }
  }

  return (
    <aside
      style={{
        width: 220,
        padding: 12,
        borderRight: "1px solid var(--color-border, #333)",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      <h4 style={{ ...sectionHeading, marginTop: 0 }}>Source</h4>
      {sourceLabels.map(([t, label]) => (
        <label key={t} style={labelStyle}>
          <input
            type="checkbox"
            checked={props.filter.sources.has(t)}
            onChange={() => toggleSource(t)}
          />
          <span>
            {label} <span style={{ opacity: 0.55 }}>({countForType(t)})</span>
          </span>
        </label>
      ))}

      <h4 style={sectionHeading}>Memory-Type</h4>
      {memoryLabels.map(([t, label]) => (
        <label key={t} style={labelStyle}>
          <input
            type="checkbox"
            checked={props.filter.memoryTypes.has(t)}
            onChange={() => toggleMemoryType(t)}
          />
          <span>{label}</span>
        </label>
      ))}

      <h4 style={sectionHeading}>Company</h4>
      {props.availableCompanies.length === 0 ? (
        <div style={{ fontSize: "0.85em", opacity: 0.55 }}>Keine Company-Tags gefunden.</div>
      ) : (
        props.availableCompanies.map((c) => (
          <label key={c} style={labelStyle}>
            <input
              type="checkbox"
              checked={props.filter.companies.has(c)}
              onChange={() => toggleCompany(c)}
            />
            <span>{c}</span>
          </label>
        ))
      )}

      <h4 style={sectionHeading}>Search</h4>
      <input
        type="text"
        value={props.filter.search}
        onChange={(e) => props.onChange({ ...props.filter, search: e.target.value })}
        placeholder="Label filtern…"
        style={{
          width: "100%",
          padding: 6,
          background: "transparent",
          border: "1px solid var(--color-border, #333)",
          color: "inherit",
          borderRadius: 4,
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={props.onRefresh}
        disabled={props.refreshing}
        style={{
          marginTop: 16,
          width: "100%",
          padding: 8,
          background: "transparent",
          border: "1px solid var(--color-border, #333)",
          color: "inherit",
          borderRadius: 4,
          cursor: props.refreshing ? "not-allowed" : "pointer",
          opacity: props.refreshing ? 0.5 : 1,
        }}
      >
        {props.refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </aside>
  );
}
