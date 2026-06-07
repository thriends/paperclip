import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scanDocs } from "../../src/data-sources/docs.js";

describe("scanDocs", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-test-"));
    await fs.mkdir(path.join(tmpDir, "specs"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "plans"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "notes"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("scans specs/plans/notes subfolders", async () => {
    await fs.writeFile(path.join(tmpDir, "specs", "2026-01-01-foo.md"), "# Foo Spec");
    await fs.writeFile(path.join(tmpDir, "plans", "2026-01-02-bar.md"), "# Bar Plan");
    await fs.writeFile(path.join(tmpDir, "notes", "2026-01-03-baz.md"), "# Baz Note");
    const result = await scanDocs(tmpDir);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map((n) => n.label)).toEqual(
      expect.arrayContaining(["2026-01-01-foo", "2026-01-02-bar", "2026-01-03-baz"]),
    );
  });

  it("uses filename (no extension) as node-id base", async () => {
    await fs.writeFile(path.join(tmpDir, "specs", "test-doc.md"), "# Test");
    const result = await scanDocs(tmpDir);
    expect(result.nodes[0].id).toBe("doc:test-doc");
  });

  it("extracts wikilinks + issue-IDs + file-paths as edges", async () => {
    const content = "Siehe [[memory-x]] und AUTV-3 und ~/PAI/souls/AUTV/cos.md.";
    await fs.writeFile(path.join(tmpDir, "specs", "test.md"), content);
    const result = await scanDocs(tmpDir);
    const edgeTypes = result.outgoingEdges.map((e) => e.type);
    expect(edgeTypes).toContain("wikilink");
    expect(edgeTypes).toContain("issue-mention");
    expect(edgeTypes).toContain("file-path");
  });
});
