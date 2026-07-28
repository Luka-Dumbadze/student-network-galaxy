"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { motion } from "framer-motion";
import type {
  FilterMode,
  Link,
  NetworkGraph,
  Node,
  RelationType,
} from "@/types/network";
import { RELATION_COLORS } from "@/types/network";
import { filterLinksByMode, linkEndpointId } from "@/lib/network-utils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
      <span className="animate-pulse tracking-widest text-sm uppercase">
        Initializing constellation…
      </span>
    </div>
  ),
});

type GraphNode = Node & {
  x?: number;
  y?: number;
};

type GraphLink = Omit<Link, "source" | "target"> & {
  source: string | GraphNode;
  target: string | GraphNode;
};

type GraphMethods = ForceGraphMethods;

const FILTER_OPTIONS: Array<{ mode: FilterMode; label: string }> = [
  { mode: "advice", label: "Advice Only" },
  { mode: "friend", label: "Friends Only" },
  { mode: "all", label: "All Connections" },
];

export interface NetworkGalaxyHandle {
  focusNode: (nodeId: string) => void;
  clearFocus: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

interface NetworkGalaxyProps {
  graph: NetworkGraph;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  /** Controlled focus from search / analytics. */
  focusNodeId?: string | null;
  onFocusNodeIdChange?: (nodeId: string | null) => void;
}

const NetworkGalaxy = forwardRef<NetworkGalaxyHandle, NetworkGalaxyProps>(
  function NetworkGalaxy(
    {
      graph,
      filterMode,
      onFilterModeChange,
      focusNodeId = null,
      onFocusNodeIdChange,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<GraphMethods | undefined>(undefined);
    const avatarImageCache = useRef<Map<string, HTMLImageElement | null>>(new Map());
    const [dims, setDims] = useState({ width: 800, height: 600 });
    const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
    const [, setAvatarVersion] = useState(0);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const measure = () => {
        setDims({ width: el.clientWidth, height: el.clientHeight });
      };
      measure();

      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const filteredLinks = useMemo(
      () => filterLinksByMode(graph.links, filterMode),
      [graph.links, filterMode],
    );

    const graphData = useMemo(
      () => ({
        nodes: graph.nodes.map((n) => ({ ...n })),
        links: filteredLinks.map((l) => ({ ...l })),
      }),
      [graph.nodes, filteredLinks],
    );

    const focusCamera = useCallback(
      (nodeId: string) => {
        const fg = fgRef.current;
        if (!fg) return;

        const target = (graphData.nodes as GraphNode[]).find(
          (n) => n.id === nodeId,
        );

        if (target?.x != null && target?.y != null) {
          fg.centerAt(target.x, target.y, 900);
          fg.zoom(3.2, 900);
          return;
        }

        fg.zoomToFit(900, 120, (n) => String((n as GraphNode).id) === nodeId);
      },
      [graphData.nodes],
    );

    useImperativeHandle(
      ref,
      () => ({
        focusNode: (nodeId: string) => {
          onFocusNodeIdChange?.(nodeId);
          // Allow highlight state to commit, then animate camera.
          requestAnimationFrame(() => focusCamera(nodeId));
        },
        clearFocus: () => onFocusNodeIdChange?.(null),
        getCanvas: () =>
          containerRef.current?.querySelector("canvas") ?? null,
      }),
      [focusCamera, onFocusNodeIdChange],
    );

    useEffect(() => {
      if (!focusNodeId) return;
      const timer = window.setTimeout(() => focusCamera(focusNodeId), 60);
      return () => window.clearTimeout(timer);
    }, [focusNodeId, focusCamera]);

    const highlightRootId = hoverNode?.id ?? focusNodeId;

    const highlight = useMemo(() => {
      if (!highlightRootId) {
        return {
          nodes: new Set<string>(),
          links: new Set<GraphLink>(),
        };
      }
      const nodeIds = new Set<string>([highlightRootId]);
      const links = new Set<GraphLink>();
      for (const link of graphData.links as GraphLink[]) {
        const s = linkEndpointId(link.source);
        const t = linkEndpointId(link.target);
        if (s === highlightRootId || t === highlightRootId) {
          nodeIds.add(s);
          nodeIds.add(t);
          links.add(link);
        }
      }
      return { nodes: nodeIds, links };
    }, [highlightRootId, graphData.links]);

    const detailNode = useMemo(() => {
    if (!highlightRootId) return null;
    return (graphData.nodes as GraphNode[]).find((n) => n.id === highlightRootId) ?? null;
  }, [highlightRootId, graphData.nodes]);

  const role = useMemo(() => {
    if (!detailNode) return null;
    const a = detailNode.inDegreeAdvice;
    const f = detailNode.inDegreeFriend;
    const k = detailNode.inDegreeKnows;
    const max = Math.max(a, f, k);

    if (max === a && a > 0) return { label: "Advisor", tone: "amber" as const };
    if (max === f && f > 0) return { label: "Connector", tone: "emerald" as const };
    if (max === k && k > 0) return { label: "Explorer", tone: "sky" as const };
    return { label: "Student", tone: "slate" as const };
  }, [detailNode]);

    const getAvatarImage = useCallback((avatarUrl?: string): HTMLImageElement | null => {
      if (!avatarUrl) return null;
      const cached = avatarImageCache.current.get(avatarUrl);
      if (cached) return cached.complete ? cached : null;
      if (avatarImageCache.current.has(avatarUrl) && cached === null) return null;

      const image = new Image();
      image.onload = () => setAvatarVersion((v) => v + 1);
      image.onerror = () => {
        avatarImageCache.current.set(avatarUrl, null);
        setAvatarVersion((v) => v + 1);
      };
      image.src = avatarUrl;
      avatarImageCache.current.set(avatarUrl, image);
      return null;
    }, []);

    const paintNode = useCallback(
      (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const isFocus = !highlightRootId || highlight.nodes.has(node.id);
        const isHovered = highlightRootId === node.id;
        const radius = Math.sqrt(Math.max(node.val, 1)) * 3.2;

        const adviceShare =
          node.inDegreeAdvice /
          Math.max(
            1,
            node.inDegreeAdvice + node.inDegreeFriend + node.inDegreeKnows,
          );
        const baseColor =
          adviceShare >= 0.45
            ? RELATION_COLORS.advice
            : node.inDegreeFriend >= node.inDegreeKnows
              ? RELATION_COLORS.friend
              : RELATION_COLORS.knows;

        ctx.save();
        ctx.globalAlpha = isFocus ? 1 : 0.12;

        const glow = ctx.createRadialGradient(
          node.x ?? 0,
          node.y ?? 0,
          radius * 0.2,
          node.x ?? 0,
          node.y ?? 0,
          radius * (isHovered ? 3.2 : 2.4),
        );
        glow.addColorStop(0, baseColor);
        glow.addColorStop(0.35, `${baseColor}55`);
        glow.addColorStop(1, `${baseColor}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(
          node.x ?? 0,
          node.y ?? 0,
          radius * (isHovered ? 3.2 : 2.4),
          0,
          Math.PI * 2,
        );
        ctx.fill();

        const avatarImage = getAvatarImage(node.avatarUrl);
        if (avatarImage) {
          // Circular clipped avatar with glowing border.
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(
            avatarImage,
            (node.x ?? 0) - radius,
            (node.y ?? 0) - radius,
            radius * 2,
            radius * 2,
          );
          ctx.restore();

          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
          ctx.strokeStyle = isHovered ? "#FFFFFF" : baseColor;
          ctx.lineWidth = Math.max(1.5 / globalScale, radius * 0.18);
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = isHovered ? 24 : 14;
          ctx.stroke();
        } else {
          // Fallback glowing sphere if no avatar photo.
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? "#F8FAFC" : baseColor;
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = isHovered ? 24 : 14;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(
            (node.x ?? 0) - radius * 0.25,
            (node.y ?? 0) - radius * 0.25,
            radius * 0.35,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fill();
        }

        const fontSize = Math.max(11 / globalScale, 3.2);
        ctx.font = `600 ${fontSize}px Syne, Manrope, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isFocus ? "#FFFFFF" : "rgba(226,232,240,0.18)";
        ctx.shadowColor = "rgba(2,6,23,0.9)";
        ctx.shadowBlur = 4;
        ctx.fillText(node.name, node.x ?? 0, (node.y ?? 0) + radius + 2);

        ctx.restore();
      },
      [getAvatarImage, highlightRootId, highlight.nodes],
    );

    const paintLink = useCallback(
      (link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const start = link.source as GraphNode;
        const end = link.target as GraphNode;
        if (
          typeof start !== "object" ||
          typeof end !== "object" ||
          start.x == null ||
          start.y == null ||
          end.x == null ||
          end.y == null
        ) {
          return;
        }

      const isFocus = !highlightRootId || highlight.links.has(link);
        const color = RELATION_COLORS[link.type as RelationType] ?? "#64748B";

        ctx.save();
        ctx.globalAlpha = isFocus ? (highlightRootId ? 0.95 : 0.55) : 0.04;
        ctx.strokeStyle = color;
        ctx.lineWidth =
          (highlightRootId && isFocus ? 2.2 : 1.15) / globalScale;
        ctx.shadowColor = color;
        ctx.shadowBlur = isFocus ? 8 : 0;

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.hypot(dx, dy) || 1;
        const endRadius = Math.sqrt(Math.max(end.val ?? 1, 1)) * 3.2;
        const arrowLen = 7 / globalScale;
        const tipX = end.x - (dx / len) * (endRadius + 1);
        const tipY = end.y - (dy / len) * (endRadius + 1);
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
          tipX - arrowLen * Math.cos(angle - Math.PI / 7),
          tipY - arrowLen * Math.sin(angle - Math.PI / 7),
        );
        ctx.lineTo(
          tipX - arrowLen * Math.cos(angle + Math.PI / 7),
          tipY - arrowLen * Math.sin(angle + Math.PI / 7),
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.restore();
      },
      [highlightRootId, highlight.links],
    );

    useEffect(() => {
      const fg = fgRef.current;
      if (!fg) return;
      const charge = fg.d3Force("charge");
      if (charge && typeof charge.strength === "function") {
        charge.strength(-120);
      }
      const link = fg.d3Force("link");
      if (link && typeof link.distance === "function") {
        link.distance(55);
      }
    }, [graphData]);

    // Clear stale cache entries when graph updates.
    useEffect(() => {
      const active = new Set(
        graphData.nodes
          .map((n) => n.avatarUrl)
          .filter((url): url is string => Boolean(url)),
      );
      for (const key of avatarImageCache.current.keys()) {
        if (!active.has(key)) avatarImageCache.current.delete(key);
      }
      // Trigger repaint when new URLs appear.
      setAvatarVersion((v) => v + 1);
    }, [graphData.nodes]);

    return (
      <div ref={containerRef} className="relative h-full w-full bg-slate-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(30,58,138,0.25), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(245,158,11,0.08), transparent 50%), radial-gradient(ellipse 40% 30% at 15% 70%, rgba(16,185,129,0.08), transparent 50%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.25), transparent), radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 85% 20%, rgba(255,255,255,0.35), transparent)",
            backgroundSize: "100% 100%",
          }}
        />

        <ForceGraph2D
          ref={fgRef}
          width={dims.width}
          height={dims.height}
          graphData={graphData}
          backgroundColor="rgba(2,6,23,0)"
          nodeId="id"
          nodeVal="val"
          cooldownTicks={90}
          d3VelocityDecay={0.3}
          enableNodeDrag
          linkDirectionalParticles={0}
          onNodeHover={(node) =>
            setHoverNode((node as GraphNode | null) ?? null)
          }
          onNodeClick={(node) => {
            const n = node as GraphNode | null;
            if (n?.id) onFocusNodeIdChange?.(n.id);
          }}
          onBackgroundClick={() => {
            setHoverNode(null);
            onFocusNodeIdChange?.(null);
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            paintNode(node as GraphNode, ctx, globalScale);
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNode;
            const r = Math.sqrt(Math.max(n.val ?? 1, 1)) * 3.2 + 4;
            ctx.beginPath();
            ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkCanvasObject={(link, ctx, globalScale) => {
            paintLink(link as GraphLink, ctx, globalScale);
          }}
          linkCanvasObjectMode={() => "replace"}
        />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-3"
        >
          {FILTER_OPTIONS.map(({ mode, label }) => {
            const active = filterMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onFilterModeChange(mode)}
                className={`rounded-md border px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                  active
                    ? "border-amber-400/60 bg-amber-400/15 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                    : "border-slate-700/80 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="absolute bottom-5 left-5 z-20 flex flex-col gap-2 rounded-lg border border-slate-700/60 bg-slate-950/75 px-3 py-2.5 backdrop-blur-md"
        >
          {(
            [
              ["advice", "Advice"],
              ["friend", "Friendship"],
              ["knows", "Acquaintance"],
            ] as const
          ).map(([type, label]) => (
            <div
              key={type}
              className="flex items-center gap-2 text-xs text-slate-300"
            >
              <span
                className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]"
                style={{
                  backgroundColor: RELATION_COLORS[type],
                  color: RELATION_COLORS[type],
                }}
              />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Student detail badge (hover/selection) */}
        {detailNode && role && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="absolute right-5 top-24 z-30 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
          >
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-50">
                    {detailNode.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {detailNode.inDegreeAdvice + detailNode.inDegreeFriend + detailNode.inDegreeKnows} total incoming ties
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                    role.tone === "amber"
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                      : role.tone === "emerald"
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                        : role.tone === "sky"
                          ? "border-sky-400/40 bg-sky-400/10 text-sky-100"
                          : "border-slate-700/70 bg-slate-800/30 text-slate-100"
                  }`}
                >
                  {role.label}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-semibold tracking-wide text-slate-300">
                  🌍 Global Problems
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(detailNode.globalProblems?.length ? detailNode.globalProblems : ["Not provided"]).slice(0, 3).map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/50 px-2 py-1 text-[11px] text-slate-200"
                    >
                      <span aria-hidden>🌍</span>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  },
);

export default NetworkGalaxy;
