"use client";

import { useState } from "react";

interface Props {
  seed: string;
  compact?: boolean;
}

/**
 * Every question is fully determined by its seed, so copying this string is
 * enough to come back to the exact same question later via /replay.
 */
export function SeedBadge({ seed, compact = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(seed);
    } catch {
      // Clipboard access can be blocked; the seed is still readable on screen.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy this seed to practise the exact same question again"
      className={`group inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white font-mono text-zinc-700 hover:border-zinc-500 ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      {!compact && <span className="text-zinc-400">seed</span>}
      <span className="font-semibold tracking-wide">{seed}</span>
      <span className={copied ? "text-emerald-600" : "text-zinc-400"}>
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
