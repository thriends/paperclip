const KNOWN_ISSUE_PREFIXES = [
  "AUTP", "AUTV", "AUTC", "NOO", "ELB", "POD", "OSK",
  "MIN", "AGE", "AUT", "EDU",
];

const ISSUE_ID_PATTERN = new RegExp(
  `\\b(${KNOWN_ISSUE_PREFIXES.join("|")})-(\\d+)\\b`,
  "g",
);

const WIKILINK_PATTERN = /\[\[([a-z0-9_-]+)\]\]/gi;

const PATH_PATTERN =
  /(?:~\/PAI\/|\/Users\/martinzielinski\/PAI\/)[A-Za-z0-9_./-]+\.md/g;

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;

export function stripCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_PATTERN, "");
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function extractWikilinks(text: string): string[] {
  const cleaned = stripCodeBlocks(text);
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  WIKILINK_PATTERN.lastIndex = 0;
  while ((m = WIKILINK_PATTERN.exec(cleaned)) !== null) {
    matches.push(m[1]);
  }
  return dedupe(matches);
}

export function extractIssueIds(text: string): string[] {
  const cleaned = stripCodeBlocks(text);
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  ISSUE_ID_PATTERN.lastIndex = 0;
  while ((m = ISSUE_ID_PATTERN.exec(cleaned)) !== null) {
    matches.push(`${m[1]}-${m[2]}`);
  }
  return dedupe(matches);
}

export function extractFilePaths(text: string): string[] {
  const cleaned = stripCodeBlocks(text);
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  PATH_PATTERN.lastIndex = 0;
  while ((m = PATH_PATTERN.exec(cleaned)) !== null) {
    matches.push(m[0]);
  }
  return dedupe(matches);
}
