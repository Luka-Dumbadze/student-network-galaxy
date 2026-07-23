"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  RotateCcw,
  Users,
  GitBranch,
  ChartNoAxesCombined,
} from "lucide-react";
import NetworkGalaxy, {
  type NetworkGalaxyHandle,
} from "@/components/network/NetworkGalaxy";
import CsvUploadModal from "@/components/network/CsvUploadModal";
import InfluencersPanel from "@/components/network/InfluencersPanel";
import NodeSearch from "@/components/network/NodeSearch";
import GraphExporter from "@/components/network/GraphExporter";
import AnalyticsDrawer from "@/components/network/AnalyticsDrawer";
import { MOCK_NETWORK } from "@/lib/mock-data";
import { topAdvisors } from "@/lib/network-utils";
import type { FilterMode, NetworkGraph, Node } from "@/types/network";

export default function GalaxyApp() {
  const galaxyRef = useRef<NetworkGalaxyHandle>(null);
  const [graph, setGraph] = useState<NetworkGraph>(MOCK_NETWORK);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Sample cohort (40 students)");

  const advisors = useMemo(() => topAdvisors(graph, 3), [graph]);
  const visibleLinks =
    filterMode === "all"
      ? graph.links.length
      : graph.links.filter((l) => l.type === filterMode).length;

  const focusStudent = (node: Node | null) => {
    if (!node) {
      setFocusNodeId(null);
      return;
    }
    setFocusNodeId(node.id);
    galaxyRef.current?.focusNode(node.id);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950 text-slate-100">
      <NetworkGalaxy
        ref={galaxyRef}
        graph={graph}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        focusNodeId={focusNodeId}
        onFocusNodeIdChange={setFocusNodeId}
      />

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-start justify-between gap-4 p-5"
      >
        <div className="pointer-events-auto max-w-md">
          <p className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Student Network{" "}
            <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-400 bg-clip-text text-transparent">
              Galaxy
            </span>
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400 sm:text-sm">
            Social constellation for cohorts & bootcamps — advice, friendship, and acquaintance layers.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1">
              <Users size={12} className="text-emerald-300" />
              {graph.nodes.length} students
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1">
              <GitBranch size={12} className="text-sky-300" />
              {visibleLinks} links
            </span>
            <span className="truncate text-slate-500">{sourceLabel}</span>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/15 px-3.5 py-2 text-sm font-semibold text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.2)] transition hover:bg-amber-400/25"
          >
            <Upload size={16} />
            📥 Upload Google Forms CSV
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            <GraphExporter getCanvas={() => galaxyRef.current?.getCanvas() ?? null} />
            <button
              type="button"
              onClick={() => setAnalyticsOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
            >
              <ChartNoAxesCombined size={15} />
              Mentor Insights
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setGraph(MOCK_NETWORK);
              setSourceLabel("Sample cohort (40 students)");
              setFilterMode("all");
              setFocusNodeId(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <RotateCcw size={12} />
            Reset sample data
          </button>
        </div>
      </motion.header>

      {/* Search — top-left overlay under brand */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="pointer-events-auto absolute left-5 top-36 z-30 sm:top-40"
      >
        <NodeSearch
          nodes={graph.nodes}
          selectedId={focusNodeId}
          onSelect={focusStudent}
        />
      </motion.div>

      <div className="pointer-events-none absolute right-5 top-44 z-30 sm:top-48">
        <InfluencersPanel advisors={advisors} />
      </div>

      <CsvUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onLoaded={(next, meta) => {
          setGraph(next);
          setSourceLabel(meta.fileName);
          setFilterMode("all");
          setFocusNodeId(null);
        }}
      />

      <AnalyticsDrawer
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        graph={graph}
        onFocusStudent={(nodeId) => {
          const node = graph.nodes.find((n) => n.id === nodeId) ?? null;
          focusStudent(node);
          setAnalyticsOpen(false);
        }}
      />
    </div>
  );
}
