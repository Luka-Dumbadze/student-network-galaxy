"use client";

import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import type { Node } from "@/types/network";
import { RELATION_COLORS } from "@/types/network";

interface InfluencersPanelProps {
  advisors: Node[];
}

const MEDALS = ["#F59E0B", "#E2E8F0", "#D97706"];

export default function InfluencersPanel({ advisors }: InfluencersPanelProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="pointer-events-auto w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 shadow-xl shadow-black/40 backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-md bg-amber-400/15 p-1.5 text-amber-300">
          <Crown size={16} />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold tracking-wide text-slate-100">
            Top Influencers
          </h2>
          <p className="text-[11px] text-slate-400">
            Most sought-after advisors
          </p>
        </div>
      </div>

      <ol className="space-y-2.5">
        {advisors.map((node, index) => (
          <motion.li
            key={node.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.08 }}
            className="flex items-center gap-3 rounded-xl border border-slate-800/90 bg-slate-900/60 px-3 py-2.5"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-950"
              style={{
                backgroundColor: MEDALS[index] ?? RELATION_COLORS.advice,
                boxShadow: `0 0 16px ${MEDALS[index] ?? RELATION_COLORS.advice}55`,
              }}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">
                {node.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-200/80">
                <Sparkles size={11} />
                {node.inDegreeAdvice} advice nominations
              </p>
            </div>
          </motion.li>
        ))}
        {advisors.length === 0 && (
          <li className="text-xs text-slate-500">No advisor data yet.</li>
        )}
      </ol>
    </motion.aside>
  );
}
