import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "autopilot.knowledge-graph";
const PLUGIN_VERSION = "0.1.0";
const MINI_WIDGET_SLOT_ID = "knowledge-graph-mini";
const MINI_WIDGET_EXPORT_NAME = "MiniWidget";
const FULL_PAGE_ROUTE_ID = "knowledge-graph-full";
const FULL_PAGE_EXPORT_NAME = "FullPageRoute";

/**
 * Knowledge Graph plugin — force-directed visualisation of Memory, Docs,
 * Souls and Issues with `[[wikilink]]` + issue-mention edges.
 *
 * Slot types adapted from the plan:
 * - The original plan used `type: "route"` but the SDK only supports
 *   `page` for company-scoped routes (see PLUGIN_UI_SLOT_TYPES in
 *   packages/shared/src/constants.ts). The host serves `page` slots at
 *   `/:companyPrefix/<routePath>`, which matches the intent (full-page
 *   route mounted in the host shell).
 * - Capability `ui.route.register` was renamed to `ui.page.register`
 *   for the same reason.
 */
const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Knowledge Graph",
  description:
    "Force-directed visualisation of Memory, Docs, Souls and Issues with [[wikilink]] + issue-mention edges.",
  author: "Autopilot",
  categories: ["ui", "workspace"],
  capabilities: [
    "ui.dashboardWidget.register",
    "ui.page.register",
    "companies.read",
    "issues.read",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: MINI_WIDGET_SLOT_ID,
        displayName: "Knowledge Graph (Top-50)",
        exportName: MINI_WIDGET_EXPORT_NAME,
      },
      {
        type: "page",
        id: FULL_PAGE_ROUTE_ID,
        routePath: "knowledge-graph",
        displayName: "Knowledge Graph",
        exportName: FULL_PAGE_EXPORT_NAME,
      },
    ],
  },
};

export default manifest;
