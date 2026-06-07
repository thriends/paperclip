import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scanMemory } from "../../src/data-sources/memory.js";

describe("scanMemory", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array when no .md files", async () => {
    expect(await scanMemory(tmpDir)).toEqual({ nodes: [], outgoingEdges: [] });
  });

  it("skips MEMORY.md", async () => {
    await fs.writeFile(path.join(tmpDir, "MEMORY.md"), "- [Link](other.md)");
    const result = await scanMemory(tmpDir);
    expect(result.nodes).toEqual([]);
  });

  it("parses frontmatter name + type", async () => {
    const content = `---
name: project-test-foo
description: Foo description
metadata:
  type: project
---

Body here.`;
    await fs.writeFile(path.join(tmpDir, "project_test_foo.md"), content);
    const result = await scanMemory(tmpDir);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      id: "memory:project-test-foo",
      type: "memory",
      label: "project-test-foo",
      metadata: { memoryType: "project", path: expect.stringContaining("project_test_foo.md") },
    });
  });

  it("extracts wikilinks + issue-IDs as outgoing edges", async () => {
    const content = `---
name: project-a
---

Verweis auf [[project-b]] und AUTP-56.`;
    await fs.writeFile(path.join(tmpDir, "project_a.md"), content);
    const result = await scanMemory(tmpDir);
    expect(result.outgoingEdges).toEqual(
      expect.arrayContaining([
        { sourceId: "memory:project-a", targetRef: "project-b", type: "wikilink" },
        { sourceId: "memory:project-a", targetRef: "AUTP-56", type: "issue-mention" },
      ]),
    );
  });

  it("skips files without name: frontmatter", async () => {
    await fs.writeFile(path.join(tmpDir, "no_name.md"), "No frontmatter here");
    const result = await scanMemory(tmpDir);
    expect(result.nodes).toEqual([]);
  });
});
