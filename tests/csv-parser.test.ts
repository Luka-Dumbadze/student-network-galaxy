import { describe, expect, it } from "vitest";
import {
  parseGoogleFormsCsv,
  splitNameList,
} from "@/lib/csv-parser";
import { computeNodeMetrics, buildNetworkGraph } from "@/lib/network-utils";
import type { Link } from "@/types/network";

describe("splitNameList", () => {
  it("parses comma and semicolon multi-select lists", () => {
    expect(splitNameList("Ana Gelashvili; Davit Tsiklauri, Tamar Chkheidze")).toEqual([
      "Ana Gelashvili",
      "Davit Tsiklauri",
      "Tamar Chkheidze",
    ]);
  });

  it("ignores empty tokens and N/A placeholders", () => {
    expect(splitNameList("Nino Beridze, n/a, , | Sopho Lomidze")).toEqual([
      "Nino Beridze",
      "Sopho Lomidze",
    ]);
  });
});

describe("parseGoogleFormsCsv", () => {
  const header =
    "Timestamp,Your Name,Who do you ask for advice?,Who is your friend?,Who do you know?";

  it("parses global problems columns into node.globalProblems (cleansing + splitting)", () => {
    const headerWithProblems =
      "Timestamp,Your Name,Who do you ask for advice?,Who is your friend?,Who do you know?,Photo URL,Global Problem 1,Global Problem 2,Global Problem 3";

    const csv = [
      headerWithProblems,
      "t,Nino Beridze,Mentor X,Ana Gelashvili,Luka Abashidze,https://img.local/nino.jpg,\"Climate Change, Cybersecurity\",Digital Inclusion,",
      "t,Ana Gelashvili,Mentor X,,Nino Beridze,https://img.local/ana.webp,Food security,,Reducing inequality",
    ].join("\n");

    const { graph } = parseGoogleFormsCsv(csv);
    const nino = graph.nodes.find((n) => n.name === "Nino Beridze");
    const ana = graph.nodes.find((n) => n.name === "Ana Gelashvili");

    expect(nino?.globalProblems).toEqual([
      "Climate Change",
      "Cybersecurity",
      "Digital Inclusion",
    ]);
    expect(nino?.avatarUrl).toBe("https://img.local/nino.jpg");
    expect(ana?.globalProblems).toEqual([
      "Food security",
      "Reducing inequality",
    ]);
    expect(ana?.avatarUrl).toBe("https://img.local/ana.webp");
  });

  it("parses multi-select relationship cells into typed links", () => {
    const csv = [
      header,
      "2026-01-01,Nino Beridze,\"Mariam Kapanadze; Davit Tsiklauri\",\"Ana Gelashvili\",\"Luka Abashidze, Sopho Lomidze\"",
      "2026-01-01,Ana Gelashvili,Mariam Kapanadze,Nino Beridze,Davit Tsiklauri",
    ].join("\n");

    const { graph, warnings } = parseGoogleFormsCsv(csv);

    expect(warnings.length).toBe(0);
    expect(graph.nodes.map((n) => n.name).sort()).toEqual(
      [
        "Ana Gelashvili",
        "Davit Tsiklauri",
        "Luka Abashidze",
        "Mariam Kapanadze",
        "Nino Beridze",
        "Sopho Lomidze",
      ].sort(),
    );

    expect(graph.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "advice",
          source: "nino-beridze",
          target: "mariam-kapanadze",
        }),
        expect.objectContaining({
          type: "friend",
          source: "nino-beridze",
          target: "ana-gelashvili",
        }),
        expect.objectContaining({
          type: "knows",
          source: "nino-beridze",
          target: "luka-abashidze",
        }),
      ]),
    );
  });

  it("calculates in-degree centrality and node val", () => {
    const csv = [
      header,
      "t,Student A,Mentor X,Student B,Mentor X",
      "t,Student B,Mentor X,Student A,",
      "t,Student C,Mentor X,,",
    ].join("\n");

    const { graph } = parseGoogleFormsCsv(csv);
    const mentor = graph.nodes.find((n) => n.name === "Mentor X");
    const studentA = graph.nodes.find((n) => n.name === "Student A");

    expect(mentor?.inDegreeAdvice).toBe(3);
    expect(mentor?.inDegreeKnows).toBe(1);
    expect(mentor?.inDegreeFriend).toBe(0);
    expect(totalIn(mentor!)).toBe(4);
    expect(mentor!.val).toBeGreaterThan(studentA!.val);
  });

  it("skips empty rows and deduplicates respondents by name", () => {
    const csv = [
      header,
      ",,,,",
      "t,Nino Beridze,Mariam Kapanadze,,",
      "t,nino beridze,Davit Tsiklauri,Ana Gelashvili,",
      "t,,,",
    ].join("\n");

    const { graph } = parseGoogleFormsCsv(csv);
    const ninos = graph.nodes.filter(
      (n) => n.name.toLowerCase() === "nino beridze",
    );
    expect(ninos).toHaveLength(1);

    const adviceFromNino = graph.links.filter(
      (l) => l.source === ninos[0].id && l.type === "advice",
    );
    expect(adviceFromNino).toHaveLength(2);
  });

  it("throws on completely empty CSV payloads", () => {
    expect(() => parseGoogleFormsCsv("Your Name,Who do you ask for advice?\n")).toThrow(
      /empty/i,
    );
  });
});

describe("computeNodeMetrics", () => {
  it("aggregates in-degree by relation type", () => {
    const names = new Map([
      ["a", "A"],
      ["b", "B"],
      ["c", "C"],
    ]);
    const links: Link[] = [
      { source: "a", target: "b", type: "advice" },
      { source: "c", target: "b", type: "advice" },
      { source: "a", target: "b", type: "friend" },
      { source: "b", target: "c", type: "knows" },
    ];

    const nodes = computeNodeMetrics(names, links);
    const b = nodes.find((n) => n.id === "b")!;
    expect(b.inDegreeAdvice).toBe(2);
    expect(b.inDegreeFriend).toBe(1);
    expect(b.inDegreeKnows).toBe(0);
    expect(b.val).toBe(Math.max(1, 1 + 3 * 0.85));
  });

  it("buildNetworkGraph adds missing endpoints as nodes", () => {
    const graph = buildNetworkGraph(
      [{ id: "a", name: "A" }],
      [{ source: "a", target: "ghost", type: "knows" }],
    );
    expect(graph.nodes.some((n) => n.id === "ghost")).toBe(true);
    expect(graph.nodes.find((n) => n.id === "ghost")?.inDegreeKnows).toBe(1);
  });
});

function totalIn(node: {
  inDegreeAdvice: number;
  inDegreeFriend: number;
  inDegreeKnows: number;
}): number {
  return node.inDegreeAdvice + node.inDegreeFriend + node.inDegreeKnows;
}
