import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchIssues } from "../../src/data-sources/issues.js";

describe("fetchIssues", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches issues from one company", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "c1", name: "AUTP-Company", issuePrefix: "AUTP" },
        ],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "i1",
            identifier: "AUTP-1",
            title: "Test Issue",
            status: "in_progress",
            description: "Body with [[memory-x]]",
            parentId: null,
            companyId: "c1",
          },
        ],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

    const result = await fetchIssues("http://localhost:3100", "test-token");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      id: "issue:AUTP-1",
      type: "issue",
      label: "AUTP-1",
      metadata: { company: "AUTP", issueStatus: "in_progress" },
    });
    const edgeTypes = result.outgoingEdges.map((e) => e.type);
    expect(edgeTypes).toContain("wikilink");
  });

  it("extracts parent-child edges", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "c1", issuePrefix: "AUTP" }],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "i1", identifier: "AUTP-1", status: "done", description: "", parentId: null, companyId: "c1" },
          { id: "i2", identifier: "AUTP-2", status: "done", description: "", parentId: "i1", companyId: "c1" },
        ],
      } as Response)
      .mockResolvedValue({ ok: true, json: async () => [] } as Response);

    const result = await fetchIssues("http://localhost:3100", "tok");
    const parentEdges = result.outgoingEdges.filter((e) => e.type === "parent-child");
    expect(parentEdges).toContainEqual({
      sourceId: "issue:AUTP-2",
      targetRef: "issue:AUTP-1",
      type: "parent-child",
    });
  });

  it("returns empty when API fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const result = await fetchIssues("http://localhost:3100", "tok");
    expect(result.nodes).toEqual([]);
    expect(result.outgoingEdges).toEqual([]);
  });
});
