import type { Link, NetworkGraph, Node, RelationType } from "@/types/network";

/** Resolve force-graph link endpoints which may be ids or node objects. */
export function linkEndpointId(
  endpoint: string | number | { id?: string | number } | undefined,
): string {
  if (endpoint == null) return "";
  if (typeof endpoint === "object") return String(endpoint.id ?? "");
  return String(endpoint);
}

export function computeNodeMetrics(
  names: Map<string, string>,
  links: Link[],
  globalProblemsById?: Map<string, string[]>,
  avatarById?: Map<string, string>,
): Node[] {
  const degrees = new Map<
    string,
    { advice: number; friend: number; knows: number }
  >();

  for (const id of names.keys()) {
    degrees.set(id, { advice: 0, friend: 0, knows: 0 });
  }

  for (const link of links) {
    const target = linkEndpointId(link.target);
    const bucket = degrees.get(target);
    if (!bucket) continue;
    bucket[link.type] += 1;
  }

  return Array.from(names.entries()).map(([id, name]) => {
    const d = degrees.get(id) ?? { advice: 0, friend: 0, knows: 0 };
    const total = d.advice + d.friend + d.knows;
    return {
      id,
      name,
      inDegreeAdvice: d.advice,
      inDegreeFriend: d.friend,
      inDegreeKnows: d.knows,
      // Keep small nodes visible; scale with centrality for constellation weight.
      val: Math.max(1, 1 + total * 0.85),
      avatarUrl: avatarById?.get(id),
      globalProblems: globalProblemsById?.get(id),
    };
  });
}

export function buildNetworkGraph(
  people: Array<{
    id: string;
    name: string;
    globalProblems?: string[];
    avatarUrl?: string;
  }>,
  links: Link[],
): NetworkGraph {
  const names = new Map(people.map((p) => [p.id, p.name]));
  const globalProblemsById = new Map<string, string[]>();
  const avatarById = new Map<string, string>();
  for (const p of people) {
    if (p.globalProblems?.length) globalProblemsById.set(p.id, p.globalProblems);
    if (p.avatarUrl) avatarById.set(p.id, p.avatarUrl);
  }
  // Ensure every link endpoint exists as a node.
  for (const link of links) {
    for (const end of [link.source, link.target]) {
      const id = linkEndpointId(end);
      if (id && !names.has(id)) names.set(id, id);
    }
  }
  return {
    nodes: computeNodeMetrics(names, links, globalProblemsById, avatarById),
    links,
  };
}

export function topAdvisors(graph: NetworkGraph, count = 3): Node[] {
  return [...graph.nodes]
    .sort((a, b) => b.inDegreeAdvice - a.inDegreeAdvice)
    .slice(0, count);
}

export function filterLinksByMode(
  links: Link[],
  mode: "advice" | "friend" | "all",
): Link[] {
  if (mode === "all") return links;
  const type: RelationType = mode;
  return links.filter((l) => l.type === type);
}
