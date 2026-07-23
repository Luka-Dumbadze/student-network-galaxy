"use client";

import { useState } from "react";
import { Camera } from "lucide-react";

interface GraphExporterProps {
  getCanvas: () => HTMLCanvasElement | null;
  filename?: string;
  className?: string;
}

export function exportCanvasPng(
  canvas: HTMLCanvasElement,
  filename = "student-network-galaxy.png",
): void {
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export default function GraphExporter({
  getCanvas,
  filename = "student-network-galaxy.png",
  className = "",
}: GraphExporterProps) {
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    setError(null);
    const canvas = getCanvas();
    if (!canvas) {
      setError("Canvas not ready yet.");
      return;
    }
    try {
      exportCanvasPng(canvas, filename);
    } catch {
      setError("Export failed.");
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20"
      >
        <Camera size={15} />
        📸 Export Screenshot
      </button>
      {error && (
        <p className="mt-1 text-[11px] text-rose-300" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
