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
  /** Profile photo URL (from CSV image columns or local object URL binding). */
  avatarUrl?: string;
  /**
   * Exactly the 3 (up to) selected global problems for this student.
   * Parsed from Google Forms global problems columns; optional for older CSVs.
   */
  globalProblems?: string[];
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
