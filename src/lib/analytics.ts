import type { NetworkGraph, Node } from "@/types/network";
import { linkEndpointId } from "@/lib/network-utils";

export interface StudentMetrics extends Node {
  totalInDegree: number;
  totalOutDegree: number;
  betweenness: number;
  /** Unique neighbors reached across all relation types. */
  uniqueNeighbors: number;
}

export interface CohortAnalytics {
  influencers: StudentMetrics[];
  bridges: StudentMetrics[];
  needsIntegration: StudentMetrics[];
  all: StudentMetrics[];
}

export function totalInDegree(node: Node): number {
  return node.inDegreeAdvice + node.inDegreeFriend + node.inDegreeKnows;
}

/** Brandes betweenness on the undirected projection of the cohort graph. */
export function computeBetweenness(graph: NetworkGraph): Map<string, number> {
  const ids = graph.nodes.map((n) => n.id);
  const adj = new Map<string, Set<string>>();
  for (const id of ids) adj.set(id, new Set());

  for (const link of graph.links) {
    const s = linkEndpointId(link.source);
    const t = linkEndpointId(link.target);
    if (!s || !t || s === t) continue;
    adj.get(s)?.add(t);
    adj.get(t)?.add(s);
  }

  const betweenness = new Map<string, number>();
  for (const id of ids) betweenness.set(id, 0);

  for (const source of ids) {
    const stack: string[] = [];
    const preds = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();

    for (const v of ids) {
      preds.set(v, []);
      sigma.set(v, 0);
      dist.set(v, -1);
    }
    sigma.set(source, 1);
    dist.set(source, 0);

    const queue: string[] = [source];
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj.get(v) ?? []) {
        if ((dist.get(w) ?? -1) < 0) {
          dist.set(w, (dist.get(v) ?? 0) + 1);
          queue.push(w);
        }
        if (dist.get(w) === (dist.get(v) ?? 0) + 1) {
          sigma.set(w, (sigma.get(w) ?? 0) + (sigma.get(v) ?? 0));
          preds.get(w)?.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    for (const v of ids) delta.set(v, 0);

    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of preds.get(w) ?? []) {
        const share =
          ((sigma.get(v) ?? 0) / Math.max(sigma.get(w) ?? 1, 1)) *
          (1 + (delta.get(w) ?? 0));
        delta.set(v, (delta.get(v) ?? 0) + share);
      }
      if (w !== source) {
        betweenness.set(w, (betweenness.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
  }

  // Undirected Brandes counts each pair twice.
  for (const id of ids) {
    betweenness.set(id, (betweenness.get(id) ?? 0) / 2);
  }

  return betweenness;
}

function outDegrees(graph: NetworkGraph): Map<string, number> {
  const out = new Map<string, number>();
  for (const n of graph.nodes) out.set(n.id, 0);
  for (const link of graph.links) {
    const s = linkEndpointId(link.source);
    out.set(s, (out.get(s) ?? 0) + 1);
  }
  return out;
}

function uniqueNeighborCounts(graph: NetworkGraph): Map<string, number> {
  const neighbors = new Map<string, Set<string>>();
  for (const n of graph.nodes) neighbors.set(n.id, new Set());
  for (const link of graph.links) {
    const s = linkEndpointId(link.source);
    const t = linkEndpointId(link.target);
    neighbors.get(s)?.add(t);
    neighbors.get(t)?.add(s);
  }
  const counts = new Map<string, number>();
  for (const [id, set] of neighbors) counts.set(id, set.size);
  return counts;
}

export function computeStudentMetrics(graph: NetworkGraph): StudentMetrics[] {
  const betweenness = computeBetweenness(graph);
  const outs = outDegrees(graph);
  const unique = uniqueNeighborCounts(graph);

  return graph.nodes.map((node) => ({
    ...node,
    totalInDegree: totalInDegree(node),
    totalOutDegree: outs.get(node.id) ?? 0,
    betweenness: betweenness.get(node.id) ?? 0,
    uniqueNeighbors: unique.get(node.id) ?? 0,
  }));
}

export function computeCohortAnalytics(
  graph: NetworkGraph,
  options?: { influencerCount?: number; bridgeCount?: number },
): CohortAnalytics {
  const influencerCount = options?.influencerCount ?? 8;
  const bridgeCount = options?.bridgeCount ?? 8;
  const all = computeStudentMetrics(graph);

  const influencers = [...all]
    .sort(
      (a, b) =>
        b.inDegreeAdvice - a.inDegreeAdvice ||
        b.totalInDegree - a.totalInDegree,
    )
    .slice(0, influencerCount);

  // Bridges: high betweenness, with unique-neighbor tie-break (cross-group reach).
  const bridges = [...all]
    .sort(
      (a, b) =>
        b.betweenness - a.betweenness ||
        b.uniqueNeighbors - a.uniqueNeighbors,
    )
    .filter((n) => n.betweenness > 0 || n.uniqueNeighbors >= 4)
    .slice(0, bridgeCount);

  const needsIntegration = [...all]
    .filter((n) => n.totalInDegree <= 1)
    .sort(
      (a, b) =>
        a.totalInDegree - b.totalInDegree ||
        a.totalOutDegree - b.totalOutDegree ||
        a.name.localeCompare(b.name),
    );

  return { influencers, bridges, needsIntegration, all };
}

export function analyticsToCsv(metrics: StudentMetrics[]): string {
  const header = [
    "id",
    "name",
    "in_degree_advice",
    "in_degree_friend",
    "in_degree_knows",
    "total_in_degree",
    "total_out_degree",
    "betweenness",
    "unique_neighbors",
    "val",
  ];

  const escape = (value: string | number): string => {
    const raw = String(value);
    if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  };

  const rows = [...metrics]
    .sort((a, b) => b.inDegreeAdvice - a.inDegreeAdvice || a.name.localeCompare(b.name))
    .map((m) =>
      [
        m.id,
        m.name,
        m.inDegreeAdvice,
        m.inDegreeFriend,
        m.inDegreeKnows,
        m.totalInDegree,
        m.totalOutDegree,
        Number(m.betweenness.toFixed(4)),
        m.uniqueNeighbors,
        Number(m.val.toFixed(2)),
      ]
        .map(escape)
        .join(","),
    );

  return [header.join(","), ...rows].join("\n");
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime = "text/csv;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
