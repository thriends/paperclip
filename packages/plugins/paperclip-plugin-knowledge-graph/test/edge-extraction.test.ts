import { describe, it, expect } from "vitest";
import {
  extractWikilinks,
  extractIssueIds,
  extractFilePaths,
  stripCodeBlocks,
} from "../src/edge-extraction.js";

describe("stripCodeBlocks", () => {
  it("removes fenced code blocks", () => {
    const input = "Hello\n```bash\ncode here [[xref]]\n```\nWorld [[real-xref]]";
    expect(stripCodeBlocks(input)).toBe("Hello\n\nWorld [[real-xref]]");
  });

  it("keeps text without code blocks", () => {
    expect(stripCodeBlocks("Just text [[xref]]")).toBe("Just text [[xref]]");
  });
});

describe("extractWikilinks", () => {
  it("extracts simple [[name]] patterns", () => {
    const result = extractWikilinks("Siehe [[project-paperclip]] und [[feedback-claude]].");
    expect(result).toEqual(["project-paperclip", "feedback-claude"]);
  });

  it("ignores wikilinks in code blocks", () => {
    const result = extractWikilinks("Real [[xref]]\n```\nFake [[code-only]]\n```");
    expect(result).toEqual(["xref"]);
  });

  it("deduplicates wikilinks", () => {
    expect(extractWikilinks("[[a]] und [[a]] und [[b]]")).toEqual(["a", "b"]);
  });

  it("returns empty array for no matches", () => {
    expect(extractWikilinks("No wikilinks here")).toEqual([]);
  });
});

describe("extractIssueIds", () => {
  it("extracts paperclip issue IDs", () => {
    const result = extractIssueIds("Reference AUTP-56 and NOO-15 plus AUTV-3.");
    expect(result).toEqual(["AUTP-56", "NOO-15", "AUTV-3"]);
  });

  it("supports all known prefixes", () => {
    const result = extractIssueIds("AUTP-1 AUTV-2 AUTC-3 NOO-4 ELB-5 POD-6 OSK-7 MIN-8 AGE-9 AUT-10 EDU-11");
    expect(result).toHaveLength(11);
  });

  it("ignores lowercase and partial matches", () => {
    expect(extractIssueIds("autp-56 and AUTP56 and AUTP-")).toEqual([]);
  });

  it("ignores issue IDs in code blocks", () => {
    expect(extractIssueIds("Real AUTP-1\n```\nAUTP-2\n```")).toEqual(["AUTP-1"]);
  });
});

describe("extractFilePaths", () => {
  it("extracts ~/PAI paths", () => {
    const result = extractFilePaths("Siehe ~/PAI/souls/AUTV/cos.md fuer Details.");
    expect(result).toEqual(["~/PAI/souls/AUTV/cos.md"]);
  });

  it("extracts absolute paths to /Users/martinzielinski/PAI", () => {
    const result = extractFilePaths("File: /Users/martinzielinski/PAI/docs/spec.md");
    expect(result).toEqual(["/Users/martinzielinski/PAI/docs/spec.md"]);
  });

  it("ignores paths in code blocks", () => {
    expect(extractFilePaths("Real ~/PAI/a.md\n```\n~/PAI/b.md\n```")).toEqual(["~/PAI/a.md"]);
  });

  it("deduplicates paths", () => {
    expect(extractFilePaths("~/PAI/a.md und ~/PAI/a.md")).toEqual(["~/PAI/a.md"]);
  });
});
