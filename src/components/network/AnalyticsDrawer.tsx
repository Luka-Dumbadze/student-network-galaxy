"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Download,
  Globe,
  Search,
  Lightbulb,
  UserRoundSearch,
  Waypoints,
  X,
} from "lucide-react";
import type { NetworkGraph } from "@/types/network";
import {
  analyticsToCsv,
  computeCohortAnalytics,
  downloadTextFile,
} from "@/lib/analytics";

interface AnalyticsDrawerProps {
  open: boolean;
  onClose: () => void;
  graph: NetworkGraph;
  onFocusStudent?: (nodeId: string) => void;
}

export default function AnalyticsDrawer({
  open,
  onClose,
  graph,
  onFocusStudent,
}: AnalyticsDrawerProps) {
  // Avoid expensive network analytics during server prerender.
  const analytics = useMemo(
    () => {
      if (!open) return null;
      if (typeof window === "undefined") return null;
      return computeCohortAnalytics(graph);
    },
    [graph, open],
  );

  const topGlobalPassions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of graph.nodes) {
      for (const problem of node.globalProblems ?? []) {
        const key = problem.trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([problem, count]) => ({ problem, count }));
  }, [graph]);

  const [selectedPassion, setSelectedPassion] = useState<string | null>(null);
  const activePassion =
    selectedPassion ?? topGlobalPassions[0]?.problem ?? null;

  const matchedStudents = useMemo(() => {
    if (!activePassion) return [];
    return graph.nodes.filter((n) =>
      n.globalProblems?.some((p) => p === activePassion),
    );
  }, [graph, activePassion]);

  const exportCsv = () => {
    const data = analytics?.all ?? computeCohortAnalytics(graph).all;
    const csv = analyticsToCsv(data);
    downloadTextFile(csv, "student-network-analytics.csv");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close analytics drawer"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-drawer-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <h2
                  id="analytics-drawer-title"
                  className="font-[family-name:var(--font-syne)] text-lg font-semibold text-slate-50"
                >
                  Mentor Insights
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Cohort centrality, bridges, and onboarding signals
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              <Section
                icon={<Crown size={14} className="text-amber-300" />}
                title="🌟 Top Influencers / Advisors"
                subtitle="Ranked by advice in-degree"
              >
                {analytics ? (
                  analytics.influencers.map((n, i) => (
                    <MetricRow
                      key={n.id}
                      rank={i + 1}
                      name={n.name}
                      detail={`${n.inDegreeAdvice} advice · ${n.totalInDegree} total in`}
                      accent="amber"
                      onClick={() => onFocusStudent?.(n.id)}
                    />
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Computing insights…</p>
                )}
              </Section>

              <Section
                icon={<Waypoints size={14} className="text-emerald-300" />}
                title="🌉 Network Bridges / Connectors"
                subtitle="High betweenness & cross-group reach"
              >
                {analytics ? (
                  <>
                    {analytics.bridges.length === 0 && (
                      <p className="text-xs text-slate-500">
                        No bridge nodes detected.
                      </p>
                    )}
                    {analytics.bridges.map((n, i) => (
                      <MetricRow
                        key={n.id}
                        rank={i + 1}
                        name={n.name}
                        detail={`betweenness ${n.betweenness.toFixed(1)} · ${n.uniqueNeighbors} neighbors`}
                        accent="emerald"
                        onClick={() => onFocusStudent?.(n.id)}
                      />
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Computing insights…</p>
                )}
              </Section>

              <Section
                icon={<UserRoundSearch size={14} className="text-sky-300" />}
                title="🔍 Needs Integration (Low Degree)"
                subtitle="0–1 incoming ties — prioritize onboarding"
              >
                {analytics ? (
                  <>
                    {analytics.needsIntegration.length === 0 && (
                      <p className="text-xs text-slate-500">
                        Everyone has at least two incoming connections.
                      </p>
                    )}
                    {analytics.needsIntegration.map((n) => (
                      <MetricRow
                        key={n.id}
                        name={n.name}
                        detail={`${n.totalInDegree} in · ${n.totalOutDegree} out`}
                        accent="sky"
                        onClick={() => onFocusStudent?.(n.id)}
                      />
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Computing insights…</p>
                )}
              </Section>

              <Section
                icon={<Globe size={14} className="text-amber-300" />}
                title="🌍 Top Global Passions"
                subtitle="Most frequently selected global problems"
              >
                {topGlobalPassions.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No global problem data detected.
                  </p>
                )}
                {topGlobalPassions.map((p, i) => (
                  <MetricRow
                    key={p.problem}
                    rank={i + 1}
                    name={p.problem}
                    detail={`${p.count} students selected`}
                    accent="amber"
                    onClick={() => setSelectedPassion(p.problem)}
                  />
                ))}
              </Section>

              <Section
                icon={<Lightbulb size={14} className="text-emerald-300" />}
                title="💡 Shared Interest Matchmaker"
                subtitle="Students aligned to the selected top challenge"
              >
                {activePassion == null ? (
                  <p className="text-xs text-slate-500">Pick a passion to match students.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {topGlobalPassions.slice(0, 3).map((p) => {
                        const active = p.problem === activePassion;
                        return (
                          <button
                            key={p.problem}
                            type="button"
                            onClick={() => setSelectedPassion(p.problem)}
                            className={`rounded-full border px-3 py-1 text-[11px] transition ${
                              active
                                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                                : "border-slate-700/70 bg-slate-900/50 text-slate-300 hover:border-slate-500 hover:text-white"
                            }`}
                          >
                            {p.problem}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {matchedStudents.length} students share:{" "}
                      <span className="font-semibold text-slate-200">
                        {activePassion}
                      </span>
                    </p>

                    {matchedStudents.length === 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        No students matched this challenge.
                      </p>
                    )}

                    <div className="mt-3 space-y-1.5">
                      {matchedStudents.slice(0, 8).map((n, i) => {
                        const other = (n.globalProblems ?? [])
                          .filter((p) => p !== activePassion)
                          .slice(0, 2);
                        const detail = other.length
                          ? `also: ${other.join(", ")}`
                          : `focused on: ${activePassion}`;

                        return (
                          <MetricRow
                            key={n.id}
                            rank={i + 1}
                            name={n.name}
                            detail={detail}
                            accent="emerald"
                            onClick={() => onFocusStudent?.(n.id)}
                          />
                        );
                      })}
                    </div>
                    {matchedStudents.length > 8 && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Showing top {8} matches.
                      </p>
                    )}
                  </>
                )}
              </Section>
            </div>

            <div className="border-t border-slate-800 p-4">
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800"
              >
                <Download size={15} />
                📄 Export Analytics CSV
              </button>
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-500">
                <Search size={10} />
                Click a student to focus them on the galaxy
              </p>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-start gap-2">
        <div className="mt-0.5 rounded-md bg-slate-900 p-1.5">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function MetricRow({
  rank,
  name,
  detail,
  accent,
  onClick,
}: {
  rank?: number;
  name: string;
  detail: string;
  accent: "amber" | "emerald" | "sky";
  onClick?: () => void;
}) {
  const accents = {
    amber: "border-amber-500/20 hover:border-amber-400/50",
    emerald: "border-emerald-500/20 hover:border-emerald-400/50",
    sky: "border-sky-500/20 hover:border-sky-400/50",
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-xl border bg-slate-900/50 px-3 py-2 text-left transition ${accents[accent]}`}
      >
        {rank != null && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-200">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">{name}</p>
          <p className="truncate text-[11px] text-slate-400">{detail}</p>
        </div>
      </button>
    </div>
  );
}
