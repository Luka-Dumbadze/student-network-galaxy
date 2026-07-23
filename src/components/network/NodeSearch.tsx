"use client";

import { useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { Node } from "@/types/network";

interface NodeSearchProps {
  nodes: Node[];
  selectedId: string | null;
  onSelect: (node: Node | null) => void;
  className?: string;
}

export default function NodeSearch({
  nodes,
  selectedId,
  onSelect,
  className = "",
}: NodeSearchProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodes.slice(0, 8);
    return nodes
      .filter((n) => n.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [nodes, query]);

  const choose = (node: Node) => {
    setQuery(node.name);
    setOpen(false);
    onSelect(node);
  };

  const clear = () => {
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
    onSelect(null);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-72 max-w-[calc(100vw-2rem)] ${className}`}>
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Search students
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/85 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur-md">
        <Search size={15} className="shrink-0 text-sky-300" />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results[activeIndex]
              ? `${listId}-opt-${results[activeIndex].id}`
              : undefined
          }
          type="search"
          placeholder="Search student…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
            if (!e.target.value.trim()) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((i) =>
                Math.min(i + 1, Math.max(results.length - 1, 0)),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[activeIndex]) {
              e.preventDefault();
              choose(results[activeIndex]);
            } else if (e.key === "Escape") {
              clear();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
        {(query || selected) && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            className="rounded p-0.5 text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-64 overflow-auto rounded-xl border border-slate-700/80 bg-slate-950/95 py-1 shadow-xl backdrop-blur-md"
          >
            {results.map((node, index) => {
              const active = index === activeIndex;
              const isSelected = node.id === selectedId;
              return (
                <li key={node.id} role="option" aria-selected={isSelected}>
                  <button
                    id={`${listId}-opt-${node.id}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(node)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                      active || isSelected
                        ? "bg-sky-500/15 text-sky-100"
                        : "text-slate-300 hover:bg-slate-800/80"
                    }`}
                  >
                    <span className="truncate font-medium">{node.name}</span>
                    <span className="ml-2 shrink-0 text-[10px] text-slate-500">
                      adv {node.inDegreeAdvice}
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>

      {open && query.trim() && results.length === 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-xs text-slate-400">
          No students match “{query.trim()}”
        </div>
      )}
    </div>
  );
}
