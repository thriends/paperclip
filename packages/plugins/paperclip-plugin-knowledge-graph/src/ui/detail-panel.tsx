import type { GraphData, GraphNode } from "../types.js";
import { useHostNavigation } from "@paperclipai/plugin-sdk/ui";

interface DetailPanelProps {
  selectedNodeId: string | null;
  data: GraphData;
}

const sectionHeading: React.CSSProperties = {
  margin: "16px 0 8px",
  fontSize: "0.75em",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  opacity: 0.65,
  fontWeight: 500,
};

const metaRow: React.CSSProperties = {
  color: "var(--color-muted, #999)",
  fontSize: 12,
  marginTop: 2,
};

export function DetailPanel(props: DetailPanelProps) {
  const navigation = useHostNavigation();

  if (!props.selectedNodeId) {
    return (
      <aside
        style={{
          width: 280,
          padding: 12,
          borderLeft: "1px solid var(--color-border, #333)",
          color: "var(--color-muted, #888)",
          flexShrink: 0,
        }}
      >
        <em>Klicke einen Node fuer Details.</em>
      </aside>
    );
  }

  const node = props.data.nodes.find((n) => n.id === props.selectedNodeId);
  if (!node) {
    return (
      <aside
        style={{
          width: 280,
          padding: 12,
          borderLeft: "1px solid var(--color-border, #333)",
          color: "var(--color-error, #c0392b)",
          flexShrink: 0,
        }}
      >
        Node nicht gefunden.
      </aside>
    );
  }

  const backlinks = props.data.edges
    .filter((e) => e.target === node.id)
    .map((e) => props.data.nodes.find((n) => n.id === e.source))
    .filter((n): n is GraphNode => !!n);

  const outgoing = props.data.edges
    .filter((e) => e.source === node.id)
    .map((e) => props.data.nodes.find((n) => n.id === e.target))
    .filter((n): n is GraphNode => !!n);

  function openNode() {
    if (!node) return;
    if (node.type === "issue" && node.metadata.company) {
      navigation.navigate(`/${node.metadata.company}/issues/${node.label}`);
    } else if (node.metadata.path) {
      window.open(`file://${node.metadata.path}`, "_blank");
    }
  }

  const canOpen =
    (node.type === "issue" && !!node.metadata.company) || !!node.metadata.path;

  return (
    <aside
      style={{
        width: 280,
        padding: 12,
        borderLeft: "1px solid var(--color-border, #333)",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      <h3 style={{ margin: "4px 0", wordBreak: "break-word" }}>{node.label}</h3>
      <div style={metaRow}>
        Type: <strong>{node.type}</strong>
      </div>
      {node.metadata.issueStatus && (
        <div style={metaRow}>
          Status: <strong>{node.metadata.issueStatus}</strong>
        </div>
      )}
      {node.metadata.company && (
        <div style={metaRow}>
          Company: <strong>{node.metadata.company}</strong>
        </div>
      )}
      {node.metadata.memoryType && (
        <div style={metaRow}>
          Memory-Type: <strong>{node.metadata.memoryType}</strong>
        </div>
      )}
      {node.metadata.path && (
        <div
          style={{
            ...metaRow,
            fontSize: 11,
            marginTop: 6,
            wordBreak: "break-all",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {node.metadata.path}
        </div>
      )}

      <h4 style={sectionHeading}>Backlinks ({backlinks.length})</h4>
      {backlinks.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.55 }}>Keine Backlinks.</div>
      ) : (
        <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12 }}>
          {backlinks.slice(0, 30).map((b) => (
            <li key={b.id} style={{ wordBreak: "break-word" }}>
              {b.label}
            </li>
          ))}
          {backlinks.length > 30 && (
            <li style={{ opacity: 0.55 }}>…+{backlinks.length - 30} weitere</li>
          )}
        </ul>
      )}

      <h4 style={sectionHeading}>Outgoing ({outgoing.length})</h4>
      {outgoing.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.55 }}>Keine Outgoing-Links.</div>
      ) : (
        <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12 }}>
          {outgoing.slice(0, 30).map((b) => (
            <li key={b.id} style={{ wordBreak: "break-word" }}>
              {b.label}
            </li>
          ))}
          {outgoing.length > 30 && (
            <li style={{ opacity: 0.55 }}>…+{outgoing.length - 30} weitere</li>
          )}
        </ul>
      )}

      <button
        onClick={openNode}
        disabled={!canOpen}
        style={{
          marginTop: 16,
          width: "100%",
          padding: 8,
          background: "transparent",
          border: "1px solid var(--color-border, #333)",
          color: "inherit",
          borderRadius: 4,
          cursor: canOpen ? "pointer" : "not-allowed",
          opacity: canOpen ? 1 : 0.4,
        }}
      >
        Open
      </button>
    </aside>
  );
}
