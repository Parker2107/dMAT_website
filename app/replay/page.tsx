"use client";

import { useState } from "react";

import { AuthGate } from "@/components/AuthGate";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { QuestionTimer } from "@/components/QuestionTimer";
import { RulesPanel } from "@/components/RulesPanel";
import { SeedBadge } from "@/components/SeedBadge";
import { QuestionSurface } from "@/components/questions/QuestionSurface";
import { describeError } from "@/lib/errors";
import { recordAttempt } from "@/lib/attempts";
import {
  emptyAnswer,
  generateQuestion,
  gradeAnswer,
  isAnswerComplete,
} from "@/lib/generators";
import {
  TASK_LABELS,
  type Question,
  type QuestionAnswer,
} from "@/lib/generators/types";
import { parseSeed } from "@/lib/rng";
import { useStopwatch } from "@/lib/useStopwatch";

export default function ReplayPage() {
  return (
    <AuthGate>
      <Replay />
    </AuthGate>
  );
}

function Replay() {
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<QuestionAnswer>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { elapsedMs, running, stop, restart } = useStopwatch();

  function load(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseSeed(input);
    if (!parsed) {
      setQuestion(null);
      setError(
        "That is not a valid seed. Seeds look like FS-H-7K3QM2 — copy one from a question or from the dashboard.",
      );
      return;
    }

    try {
      const generated = generateQuestion(
        parsed.taskType,
        parsed.difficulty,
        parsed.seed,
      );
      setQuestion(generated);
      setAnswer(emptyAnswer(generated));
      setSubmitted(false);
      setCorrect(false);
      setError(null);
      restart();
    } catch (cause) {
      setQuestion(null);
      setError(describeError(cause));
    }
  }

  function submit() {
    if (!question) return;
    const durationMs = stop();
    const isCorrect = gradeAnswer(question, answer);
    setCorrect(isCorrect);
    setSubmitted(true);

    void recordAttempt({
      taskType: question.taskType,
      difficulty: question.difficulty,
      seed: question.seed,
      isCorrect,
      durationMs,
      answer,
      // Replays still count as practice, but are excluded from "distinct
      // questions practised" so the dashboard is not inflated by repeats.
      isReplay: true,
    });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Replay a seed</h1>
        <p className="text-sm text-zinc-600">
          Every question is fully determined by its seed. Paste one to get that
          exact question back — same figures, same options, same order.
        </p>
      </header>

      <form onSubmit={load} className="flex flex-wrap gap-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="FS-H-7K3QM2"
          spellCheck={false}
          className="w-56 rounded-md border border-zinc-300 px-3 py-2 font-mono uppercase outline-none focus:border-blue-600"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-5 py-2 font-medium text-white"
        >
          Load question
        </button>
      </form>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {question && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm">
              {TASK_LABELS[question.taskType]}
            </span>
            <span className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm capitalize">
              {question.difficulty}
            </span>
            <QuestionTimer elapsedMs={elapsedMs} running={running} />
            <SeedBadge seed={question.seed} />
          </div>

          <RulesPanel taskType={question.taskType} />

          <section className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 sm:p-6">
            <QuestionSurface
              question={question}
              answer={answer}
              onAnswer={setAnswer}
              disabled={submitted}
              showResult={submitted}
            />
          </section>

          {submitted && (
            <ExplanationPanel question={question} correct={correct} />
          )}

          {!submitted && (
            <button
              type="button"
              disabled={!isAnswerComplete(question, answer)}
              onClick={submit}
              className="rounded-md bg-blue-700 px-5 py-2.5 font-medium text-white disabled:bg-zinc-300 disabled:text-zinc-500"
            >
              Submit answer
            </button>
          )}
        </>
      )}
    </div>
  );
}
