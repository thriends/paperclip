# @autopilot/plugin-knowledge-graph

Force-directed Knowledge-Graph for Paperclip — visualises the network between Memory entities, Drive/Knowledge docs, Souls, and Issues. Wiki-style `[[link]]` references are extracted as edges so cross-references between Autopilot artefacts become navigable as a graph.

## What It Demonstrates

- multiple data-sources feeding a single graph (Memory facts, Drive/Knowledge docs, Souls, Paperclip Issues)
- `[[wikilink]]` extraction as canonical cross-reference mechanism
- a worker that aggregates + caches nodes/edges
- two UI slots: a dashboard mini-widget (snapshot) and a full-page route (interactive `vis-network` canvas)

## Data Sources

| Source | Node kind | Edge mechanism |
|:-------|:----------|:---------------|
| Autopilot Memory (`~/PAI/.../MEMORY.md` + linked entity files) | `memory` | `[[wikilink]]` between entity files |
| Drive / Knowledge docs (`~/PAI/knowledge/**`, `~/PAI/docs/**`) | `doc` | `[[wikilink]]` + path-anchored references |
| Souls (`~/PAI/souls/*.md`) | `soul` | mentions of issues, docs, other souls |
| Paperclip Issues (via host API) | `issue` | assignee, parent-issue, company, mentioned IDs |

## UI Slots

- **dashboardWidget** — small snapshot widget on the company dashboard (node/edge counts, last-refresh timestamp, "open full graph" link)
- **fullPageRoute** — interactive `vis-network` canvas at the plugin's full-page route, with filtering by source + company, click-to-focus, and breadcrumb-style navigation between connected nodes

## API Surface

- The plugin exposes worker-side endpoints to refresh + query the cached graph (consumed by the UI slots).
- Reads Paperclip Issues through host-managed plugin APIs; does not require direct DB access.

## Local Install (Dev)

From the repo root, build the plugin and install it by local path:

```bash
pnpm --filter @autopilot/plugin-knowledge-graph build
pnpm paperclipai plugin install ./packages/plugins/paperclip-plugin-knowledge-graph
```

**Local development notes:**

- **Build first.** The host resolves the worker from the manifest `entrypoints.worker` (`./dist/worker.js`). Run `pnpm build` in the plugin directory before installing so the worker bundle exists.
- **Reinstall after pulling.** If you installed a plugin by local path before the server stored `package_path`, the plugin may show status **error** (worker not found). Uninstall and install again so the server persists the path and can activate the plugin:
  `pnpm paperclipai plugin uninstall paperclip.knowledge-graph --force` then re-install.
- **Tests.** `pnpm --filter @autopilot/plugin-knowledge-graph test` runs the Vitest suite (data-sources + edge extraction + graph builder).

## References

- Design spec: `~/PAI/docs/superpowers/specs/2026-06-07-knowledge-graph-plugin-design.md`
- Implementation plan: `~/PAI/docs/superpowers/plans/2026-06-07-knowledge-graph-plugin.md`
