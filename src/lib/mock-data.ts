import type { Link, NetworkGraph } from "@/types/network";
import { buildNetworkGraph } from "@/lib/network-utils";

const STUDENTS: Array<{ id: string; name: string }> = [
  { id: "nino-beridze", name: "Nino Beridze" },
  { id: "giorgi-maisuradze", name: "Giorgi Maisuradze" },
  { id: "mariam-kapanadze", name: "Mariam Kapanadze" },
  { id: "ana-gelashvili", name: "Ana Gelashvili" },
  { id: "davit-tsiklauri", name: "Davit Tsiklauri" },
  { id: "tamar-chkheidze", name: "Tamar Chkheidze" },
  { id: "levan-javakhishvili", name: "Levan Javakhishvili" },
  { id: "sopho-lomidze", name: "Sopho Lomidze" },
  { id: "irakli-gagnidze", name: "Irakli Gagnidze" },
  { id: "khatia-mchedlishvili", name: "Khatia Mchedlishvili" },
  { id: "aleksandre-khutsishvili", name: "Aleksandre Khutsishvili" },
  { id: "elene-tabidze", name: "Elene Tabidze" },
  { id: "beka-kharazishvili", name: "Beka Kharazishvili" },
  { id: "natia-shengelia", name: "Natia Shengelia" },
  { id: "luka-abashidze", name: "Luka Abashidze" },
  { id: "salome-gogoladze", name: "Salome Gogoladze" },
  { id: "zurab-metreveli", name: "Zurab Metreveli" },
  { id: "tekla-kldiashvili", name: "Tekla Kldiashvili" },
  { id: "mikheil-otarashvili", name: "Mikheil Otarashvili" },
  { id: "mariam-chikovani", name: "Mariam Chikovani" },
  { id: "goga-kakabadze", name: "Goga Kakabadze" },
  { id: "ani-vashalomidze", name: "Ani Vashalomidze" },
  { id: "tornike-guliashvili", name: "Tornike Guliashvili" },
  { id: "nino-kvirkvelia", name: "Nino Kvirkvelia" },
  { id: "saba-tsereteli", name: "Saba Tsereteli" },
  { id: "lizi-japaridze", name: "Lizi Japaridze" },
  { id: "vakhtang-kiknadze", name: "Vakhtang Kiknadze" },
  { id: "mari-bolkvadze", name: "Mari Bolkvadze" },
  { id: "givi-razmadze", name: "Givi Razmadze" },
  { id: "tamuna-ebralidze", name: "Tamuna Ebralidze" },
  { id: "archil-shavliashvili", name: "Archil Shavliashvili" },
  { id: "kristine-gabunia", name: "Kristine Gabunia" },
  { id: "nodar-mskhiladze", name: "Nodar Mskhiladze" },
  { id: "salome-beruashvili", name: "Salome Beruashvili" },
  { id: "otari-chubinidze", name: "Otari Chubinidze" },
  { id: "nana-kalandadze", name: "Nana Kalandadze" },
  { id: "rati-shvelidze", name: "Rati Shvelidze" },
  { id: "maia-gugushvili", name: "Maia Gugushvili" },
  { id: "shota-amashukeli", name: "Shota Amashukeli" },
  { id: "eka-ninua", name: "Eka Ninua" },
];

const GLOBAL_PROBLEMS_POOL = [
  "Climate change",
  "Quality education",
  "Clean water & sanitation",
  "Sustainable cities",
  "Affordable healthcare",
  "Decent work & economic growth",
  "Gender equality",
  "Cybersecurity",
  "Food security",
  "Renewable energy",
  "Reducing inequality",
  "Digital inclusion",
];

function pickGlobalProblems(index: number): string[] {
  const picked: string[] = [];
  const seen = new Set<number>();
  for (let k = 0; k < 3; k++) {
    const idx = Math.floor(seeded(index * 13 + k * 29 + 7) * GLOBAL_PROBLEMS_POOL.length);
    if (seen.has(idx)) continue;
    seen.add(idx);
    picked.push(GLOBAL_PROBLEMS_POOL[idx] ?? GLOBAL_PROBLEMS_POOL[0]!);
    if (picked.length === 3) break;
  }
  // Fallback if we collided too many times.
  while (picked.length < 3) {
    const idx = Math.floor(seeded(index * 71 + picked.length * 17 + 1) * GLOBAL_PROBLEMS_POOL.length);
    if (seen.has(idx)) continue;
    seen.add(idx);
    picked.push(GLOBAL_PROBLEMS_POOL[idx] ?? GLOBAL_PROBLEMS_POOL[0]!);
  }
  return picked;
}

const STUDENTS_WITH_GLOBAL = STUDENTS.map((s, i) => ({
  ...s,
  globalProblems: pickGlobalProblems(i),
}));

const ids = STUDENTS_WITH_GLOBAL.map((s) => s.id);

/** Deterministic pseudo-random for stable mock topology. */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function generateLinks(): Link[] {
  const links: Link[] = [];
  const seen = new Set<string>();

  const push = (source: string, target: string, type: Link["type"]) => {
    const key = `${type}:${source}->${target}`;
    if (seen.has(key) || source === target) return;
    seen.add(key);
    links.push({ source, target, type });
  };

  // Clear thought-leader hubs for the influencers panel.
  const hubs = [
    "mariam-kapanadze",
    "davit-tsiklauri",
    "tamar-chkheidze",
  ];

  // Advice: each student names 1 advisor, mostly hubs → ~40 advice edges
  for (let i = 0; i < ids.length; i++) {
    const source = ids[i];
    const useHub = seeded(i + 1) > 0.25;
    const target = useHub
      ? hubs[Math.floor(seeded(i + 7) * hubs.length)]
      : ids[Math.floor(seeded(i + 19) * ids.length)];
    if (target) push(source, target, "advice");
  }

  // Friendship clusters of ~4–5 people with some reciprocity → denser local ties
  const clusters = [
    ids.slice(0, 5),
    ids.slice(5, 10),
    ids.slice(10, 15),
    ids.slice(15, 20),
    ids.slice(20, 25),
    ids.slice(25, 30),
    ids.slice(30, 35),
    ids.slice(35, 40),
  ];

  for (let c = 0; c < clusters.length; c++) {
    const group = clusters[c];
    for (let i = 0; i < group.length; i++) {
      const a = group[i];
      const b = group[(i + 1) % group.length];
      const d = group[(i + 2) % group.length];
      push(a, b, "friend");
      if (seeded(c * 17 + i) > 0.45) push(b, a, "friend");
      if (seeded(c * 23 + i) > 0.55) push(a, d, "friend");
    }
  }

  // Acquaintance bridges across clusters → weaker long-range ties
  for (let i = 0; i < ids.length; i++) {
    if (seeded(i + 200) < 0.35) continue;
    const target = ids[(i + 7 + Math.floor(seeded(i + 44) * 11)) % ids.length];
    push(ids[i], target, "knows");
  }

  // A few explicit cross-hub acquaintance / advice extras
  const extras: Array<[string, string, Link["type"]]> = [
    ["nino-beridze", "luka-abashidze", "knows"],
    ["giorgi-maisuradze", "saba-tsereteli", "knows"],
    ["sopho-lomidze", "mariam-kapanadze", "advice"],
    ["beka-kharazishvili", "davit-tsiklauri", "advice"],
    ["ani-vashalomidze", "tamar-chkheidze", "advice"],
    ["givi-razmadze", "aleksandre-khutsishvili", "knows"],
    ["eka-ninua", "nino-beridze", "friend"],
    ["shota-amashukeli", "goga-kakabadze", "knows"],
  ];
  for (const [s, t, type] of extras) push(s, t, type);

  return links;
}

export const MOCK_NETWORK: NetworkGraph = buildNetworkGraph(
  STUDENTS_WITH_GLOBAL,
  generateLinks(),
);

export const MOCK_STUDENT_COUNT = STUDENTS.length;
export const MOCK_LINK_COUNT = MOCK_NETWORK.links.length;
