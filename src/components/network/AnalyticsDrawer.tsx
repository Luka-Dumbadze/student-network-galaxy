"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Download,
  Search,
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
  const analytics = useMemo(() => computeCohortAnalytics(graph), [graph]);

  const exportCsv = () => {
    const csv = analyticsToCsv(analytics.all);
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
                {analytics.influencers.map((n, i) => (
                  <MetricRow
                    key={n.id}
                    rank={i + 1}
                    name={n.name}
                    detail={`${n.inDegreeAdvice} advice · ${n.totalInDegree} total in`}
                    accent="amber"
                    onClick={() => onFocusStudent?.(n.id)}
                  />
                ))}
              </Section>

              <Section
                icon={<Waypoints size={14} className="text-emerald-300" />}
                title="🌉 Network Bridges / Connectors"
                subtitle="High betweenness & cross-group reach"
              >
                {analytics.bridges.length === 0 && (
                  <p className="text-xs text-slate-500">No bridge nodes detected.</p>
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
              </Section>

              <Section
                icon={<UserRoundSearch size={14} className="text-sky-300" />}
                title="🔍 Needs Integration (Low Degree)"
                subtitle="0–1 incoming ties — prioritize onboarding"
              >
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
      <ul className="space-y-1.5">{children}</ul>
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
    <li>
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
    </li>
  );
}
