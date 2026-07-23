import Papa from "papaparse";
import type { Link, NetworkGraph, RelationType } from "@/types/network";
import { buildNetworkGraph } from "@/lib/network-utils";

const ADVICE_HINTS = [
  "advice",
  "ask for advice",
  "who do you ask",
  "mentor",
  "consult",
];
const FRIEND_HINTS = ["friend", "friends", "friendship", "close to"];
const KNOWS_HINTS = [
  "know",
  "knows",
  "acquaintance",
  "acquainted",
  "familiar",
];
const NAME_HINTS = [
  "your name",
  "full name",
  "student name",
  "name",
  "respondent",
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ა-ჰ]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function findColumn(
  headers: string[],
  hints: string[],
  exclude: Set<string> = new Set(),
): string | null {
  const normalized = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));

  for (const hint of hints) {
    const exact = normalized.find(
      (h) => !exclude.has(h.raw) && h.n === hint,
    );
    if (exact) return exact.raw;
  }

  for (const hint of hints) {
    const partial = normalized.find(
      (h) => !exclude.has(h.raw) && h.n.includes(hint),
    );
    if (partial) return partial.raw;
  }

  return null;
}

/** Split Google Forms multi-select / free-text name lists. */
export function splitNameList(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/[,;|\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^n\/?a$/i.test(s));
}

function resolvePersonId(
  name: string,
  registry: Map<string, string>,
): string {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  const existing = registry.get(key);
  if (existing) return existing;
  const id = slugify(trimmed) || `person-${registry.size + 1}`;
  registry.set(key, id);
  return id;
}

export interface CsvParseResult {
  graph: NetworkGraph;
  warnings: string[];
}

export function parseGoogleFormsCsv(csvText: string): CsvParseResult {
  const warnings: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    warnings.push(
      ...parsed.errors.slice(0, 5).map((e) => e.message || "CSV parse error"),
    );
  }

  const rows = parsed.data.filter((row) =>
    Object.values(row).some((v) => String(v ?? "").trim()),
  );

  if (rows.length === 0) {
    throw new Error("CSV appears empty — no response rows found.");
  }

  const headers = parsed.meta.fields?.filter(Boolean) ?? Object.keys(rows[0] ?? {});
  if (headers.length === 0) {
    throw new Error("CSV has no column headers.");
  }

  const used = new Set<string>();
  const nameCol = findColumn(headers, NAME_HINTS, used);
  if (nameCol) used.add(nameCol);

  const adviceCol = findColumn(headers, ADVICE_HINTS, used);
  if (adviceCol) used.add(adviceCol);

  const friendCol = findColumn(headers, FRIEND_HINTS, used);
  if (friendCol) used.add(friendCol);

  const knowsCol = findColumn(headers, KNOWS_HINTS, used);
  if (knowsCol) used.add(knowsCol);

  if (!nameCol) {
    throw new Error(
      'Could not find a respondent name column (e.g. "Your Name").',
    );
  }
  if (!adviceCol && !friendCol && !knowsCol) {
    throw new Error(
      "Could not find any relationship columns (advice / friend / knows).",
    );
  }

  if (!adviceCol) warnings.push("No advice column detected.");
  if (!friendCol) warnings.push("No friendship column detected.");
  if (!knowsCol) warnings.push("No acquaintance column detected.");

  const nameToId = new Map<string, string>();
  const people: Array<{ id: string; name: string }> = [];
  const links: Link[] = [];
  const linkKeys = new Set<string>();

  const ensurePerson = (displayName: string): string => {
    const id = resolvePersonId(displayName, nameToId);
    if (!people.some((p) => p.id === id)) {
      people.push({ id, name: displayName.trim() });
    }
    return id;
  };

  const addLinks = (
    sourceId: string,
    targets: string[],
    type: RelationType,
  ) => {
    for (const targetName of targets) {
      const targetId = ensurePerson(targetName);
      if (targetId === sourceId) continue;
      const key = `${type}:${sourceId}->${targetId}`;
      if (linkKeys.has(key)) continue;
      linkKeys.add(key);
      links.push({ source: sourceId, target: targetId, type });
    }
  };

  for (const row of rows) {
    const respondentName = String(row[nameCol] ?? "").trim();
    if (!respondentName) continue;
    const sourceId = ensurePerson(respondentName);

    if (adviceCol) {
      addLinks(sourceId, splitNameList(String(row[adviceCol] ?? "")), "advice");
    }
    if (friendCol) {
      addLinks(sourceId, splitNameList(String(row[friendCol] ?? "")), "friend");
    }
    if (knowsCol) {
      addLinks(sourceId, splitNameList(String(row[knowsCol] ?? "")), "knows");
    }
  }

  if (people.length === 0) {
    throw new Error("No named respondents found in the CSV.");
  }

  return {
    graph: buildNetworkGraph(people, links),
    warnings,
  };
}

export function parseGoogleFormsFile(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseGoogleFormsCsv(String(reader.result ?? "")));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read the CSV file."));
    reader.readAsText(file);
  });
}
