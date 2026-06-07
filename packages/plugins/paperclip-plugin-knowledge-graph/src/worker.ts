import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup() {
    // Implementation kommt in Task 8 (Worker Orchestrator).
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
