"use client";

import { DIFFICULTIES, type Difficulty } from "@/lib/generators/types";

export type DifficultyChoice = Difficulty | "random";

const LABELS: Record<DifficultyChoice, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  random: "Random",
};

interface Props {
  value: DifficultyChoice;
  onChange: (value: DifficultyChoice) => void;
  disabled?: boolean;
}

export function DifficultyPicker({ value, onChange, disabled = false }: Props) {
  const choices: DifficultyChoice[] = [...DIFFICULTIES, "random"];

  return (
    <div className="inline-flex rounded-md border border-zinc-300 bg-white p-0.5">
      {choices.map((choice) => (
        <button
          key={choice}
          type="button"
          disabled={disabled}
          onClick={() => onChange(choice)}
          className={`rounded px-3 py-1.5 text-sm ${
            value === choice
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          } disabled:opacity-50`}
        >
          {LABELS[choice]}
        </button>
      ))}
    </div>
  );
}

/** Resolves a "random" choice into a concrete difficulty. */
export function resolveDifficulty(choice: DifficultyChoice): Difficulty {
  if (choice !== "random") return choice;
  return DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
}
