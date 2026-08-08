"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AuthGate } from "@/components/AuthGate";
import {
  DifficultyPicker,
  resolveDifficulty,
  type DifficultyChoice,
} from "@/components/DifficultyPicker";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { QuestionTimer } from "@/components/QuestionTimer";
import { RulesPanel } from "@/components/RulesPanel";
import { SeedBadge } from "@/components/SeedBadge";
import { QuestionSurface } from "@/components/questions/QuestionSurface";
import { recordAttempt } from "@/lib/attempts";
import {
  emptyAnswer,
  generateQuestion,
  gradeAnswer,
  isAnswerComplete,
} from "@/lib/generators";
import {
  SLUG_TO_TASK,
  TASK_LABELS,
  TASK_SLUGS,
  type Question,
  type QuestionAnswer,
  type TaskType,
} from "@/lib/generators/types";
import { randomSeed } from "@/lib/rng";
import { useStopwatch } from "@/lib/useStopwatch";

export default function PracticePage() {
  const params = useParams<{ type: string }>();
  const taskType = SLUG_TO_TASK[params.type];
  if (!taskType) notFound();

  return (
    <AuthGate>
      <Drill taskType={taskType} />
    </AuthGate>
  );
}

function Drill({ taskType }: { taskType: TaskType }) {
  const [choice, setChoice] = useState<DifficultyChoice>("random");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<QuestionAnswer>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState({ answered: 0, correct: 0 });

  const { elapsedMs, running, stop, restart } = useStopwatch();

  const nextQuestion = useCallback(
    (nextChoice: DifficultyChoice) => {
      const difficulty = resolveDifficulty(nextChoice);
      try {
        const seed = randomSeed(taskType, difficulty);
        const generated = generateQuestion(taskType, difficulty, seed);
        setQuestion(generated);
        setAnswer(emptyAnswer(generated));
        setSubmitted(false);
        setCorrect(false);
        setError(null);
        restart();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
    [taskType, restart],
  );

  useEffect(() => {
    // The first question has to be generated after mount, not during render:
    // it draws a random seed, and doing that in render would both be impure and
    // produce a different question on the server than on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    nextQuestion(choice);
    // Mount only; the picker drives every later regeneration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit() {
    if (!question) return;
    // Freeze the clock first, so the recorded time excludes everything after.
    const durationMs = stop();
    const isCorrect = gradeAnswer(question, answer);

    setCorrect(isCorrect);
    setSubmitted(true);
    setTally((t) => ({
      answered: t.answered + 1,
      correct: t.correct + (isCorrect ? 1 : 0),
    }));

    void recordAttempt({
      taskType: question.taskType,
      difficulty: question.difficulty,
      seed: question.seed,
      isCorrect,
      durationMs,
      answer,
    });
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4">
        <p className="font-semibold">Could not generate a question</p>
        <p className="mt-1 font-mono text-sm">{error}</p>
        <button
          type="button"
          onClick={() => nextQuestion(choice)}
          className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!question) return <p className="text-sm text-zinc-500">Generating…</p>;

  const complete = isAnswerComplete(question, answer);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{TASK_LABELS[taskType]}</h1>
          <p className="text-sm text-zinc-600">
            Practice mode · {tally.correct}/{tally.answered} correct this session
          </p>
        </div>
        <Link
          href={`/exam/${TASK_SLUGS[taskType]}`}
          className="text-sm text-blue-700 underline"
        >
          Switch to a timed 20-question set →
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <DifficultyPicker
          value={choice}
          onChange={(next) => {
            setChoice(next);
            nextQuestion(next);
          }}
        />
        <span className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm capitalize">
          {question.difficulty}
        </span>
        <QuestionTimer elapsedMs={elapsedMs} running={running} />
        <SeedBadge seed={question.seed} />
      </div>

      <RulesPanel taskType={taskType} />

      <section className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 sm:p-6">
        <QuestionSurface
          question={question}
          answer={answer}
          onAnswer={setAnswer}
          disabled={submitted}
          showResult={submitted}
        />
      </section>

      {submitted && <ExplanationPanel question={question} correct={correct} />}

      <div className="flex flex-wrap gap-3">
        {!submitted ? (
          <button
            type="button"
            disabled={!complete}
            onClick={submit}
            className="rounded-md bg-blue-700 px-5 py-2.5 font-medium text-white disabled:bg-zinc-300 disabled:text-zinc-500"
          >
            Submit answer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => nextQuestion(choice)}
            className="rounded-md bg-zinc-900 px-5 py-2.5 font-medium text-white"
          >
            Next question
          </button>
        )}
        <button
          type="button"
          onClick={() => nextQuestion(choice)}
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-zinc-700 hover:border-zinc-500"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
