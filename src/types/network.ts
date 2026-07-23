export type RelationType = "advice" | "friend" | "knows";

export type FilterMode = "advice" | "friend" | "all";

export interface Node {
  id: string;
  name: string;
  inDegreeAdvice: number;
  inDegreeFriend: number;
  inDegreeKnows: number;
  /** Visual weight for force-graph nodeVal (derived from in-degree centrality). */
  val: number;
}

export interface Link {
  source: string;
  target: string;
  type: RelationType;
}

export interface NetworkGraph {
  nodes: Node[];
  links: Link[];
}

export const RELATION_COLORS: Record<RelationType, string> = {
  advice: "#F59E0B",
  friend: "#10B981",
  knows: "#3B82F6",
};

export const RELATION_LABELS: Record<RelationType, string> = {
  advice: "Advice",
  friend: "Friendship",
  knows: "Acquaintance",
};
