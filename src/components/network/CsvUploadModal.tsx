"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Upload, X, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { parseGoogleFormsFile } from "@/lib/csv-parser";
import type { NetworkGraph } from "@/types/network";

interface CsvUploadModalProps {
  open: boolean;
  onClose: () => void;
  onLoaded: (graph: NetworkGraph, meta: { fileName: string; warnings: string[] }) => void;
}

export default function CsvUploadModal({
  open,
  onClose,
  onLoaded,
}: CsvUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setError("Please upload a .csv file exported from Google Forms.");
      return;
    }

    setBusy(true);
    setError(null);
    setWarnings([]);

    try {
      const result = await parseGoogleFormsFile(file);
      setWarnings(result.warnings);
      onLoaded(result.graph, {
        fileName: file.name,
        warnings: result.warnings,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close upload dialog"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-upload-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 m-4 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2
                  id="csv-upload-title"
                  className="font-[family-name:var(--font-syne)] text-lg text-slate-50"
                >
                  Upload Google Forms CSV
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Expects columns for name + advice / friend / knows responses
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

            <div className="space-y-4 p-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition ${
                  dragging
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-slate-600 bg-slate-950/50 hover:border-slate-400"
                }`}
                onClick={() => inputRef.current?.click()}
              >
                <div className="rounded-full bg-slate-800 p-3 text-amber-300">
                  {busy ? (
                    <Upload size={22} className="animate-bounce" />
                  ) : (
                    <FileSpreadsheet size={22} />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">
                    {busy ? "Parsing constellation…" : "Drop CSV here or click to browse"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Multi-select answers as comma or semicolon lists are supported
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {warnings.length > 0 && (
                <ul className="space-y-1 text-xs text-amber-200/90">
                  {warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
