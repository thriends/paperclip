import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { scanSouls } from "../../src/data-sources/souls.js";

describe("scanSouls", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "souls-test-"));
    await fs.mkdir(path.join(tmpDir, "AUTV"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "NOO"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("scans cos.md per company-folder", async () => {
    await fs.writeFile(path.join(tmpDir, "AUTV", "cos.md"), "# AUTV CoS");
    await fs.writeFile(path.join(tmpDir, "NOO", "cos.md"), "# NOO CoS");
    const result = await scanSouls(tmpDir);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(["soul:AUTV/cos", "soul:NOO/cos"]),
    );
  });

  it("scans sub-agent souls (z.B. NOO/sales.md)", async () => {
    await fs.writeFile(path.join(tmpDir, "NOO", "cos.md"), "# NOO CoS");
    await fs.writeFile(path.join(tmpDir, "NOO", "sales.md"), "# NOO Sales");
    const result = await scanSouls(tmpDir);
    expect(result.nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(["soul:NOO/cos", "soul:NOO/sales"]),
    );
  });

  it("sets company-metadata from folder-name", async () => {
    await fs.writeFile(path.join(tmpDir, "AUTV", "cos.md"), "# x");
    const result = await scanSouls(tmpDir);
    expect(result.nodes[0].metadata.company).toBe("AUTV");
  });

  it("extracts issue-IDs + file-paths as edges", async () => {
    const content = "Eskaliere mit AUTP-56 und siehe ~/PAI/docs/spec.md";
    await fs.writeFile(path.join(tmpDir, "AUTV", "cos.md"), content);
    const result = await scanSouls(tmpDir);
    const types = result.outgoingEdges.map((e) => e.type);
    expect(types).toContain("issue-mention");
    expect(types).toContain("file-path");
  });
});
