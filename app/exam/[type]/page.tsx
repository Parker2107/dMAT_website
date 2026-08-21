"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuthGate } from "@/components/AuthGate";
import {
  DifficultyPicker,
  resolveDifficulty,
  type DifficultyChoice,
} from "@/components/DifficultyPicker";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { RulesPanel } from "@/components/RulesPanel";
import { SeedBadge } from "@/components/SeedBadge";
import { SupportCallout } from "@/components/SupportCallout";
import { QuestionSurface } from "@/components/questions/QuestionSurface";
import {
  createExamSession,
  finishExamSession,
  recordAttempt,
} from "@/lib/attempts";
import { describeError } from "@/lib/errors";
import { formatDuration, formatSeconds } from "@/lib/format";
import {
  emptyAnswer,
  generateQuestion,
  gradeAnswer,
  isAnswerComplete,
} from "@/lib/generators";
import {
  EXAM_DURATION_MS,
  EXAM_PACE_MS,
  EXAM_QUESTION_COUNT,
  SLUG_TO_TASK,
  TASK_LABELS,
  TASK_SLUGS,
  type Question,
  type QuestionAnswer,
  type TaskType,
} from "@/lib/generators/types";
import { randomSeed } from "@/lib/rng";
import { useCountdown } from "@/lib/useStopwatch";

export default function ExamPage() {
  const params = useParams<{ type: string }>();
  const taskType = SLUG_TO_TASK[params.type];
  if (!taskType) notFound();

  return (
    <AuthGate>
      <ExamFlow taskType={taskType} />
    </AuthGate>
  );
}

type Phase = "setup" | "running" | "finished";

function ExamFlow({ taskType }: { taskType: TaskType }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [choice, setChoice] = useState<DifficultyChoice>("random");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  function start() {
    try {
      const generated: Question[] = [];
      for (let i = 0; i < EXAM_QUESTION_COUNT; i++) {
        const difficulty = resolveDifficulty(choice);
        const seed = randomSeed(taskType, difficulty);
        generated.push(generateQuestion(taskType, difficulty, seed));
      }
      setQuestions(generated);
      setPhase("running");
    } catch (cause) {
      setError(describeError(cause));
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4">
        <p className="font-semibold">Could not build the exam set</p>
        <p className="mt-1 font-mono text-sm">{error}</p>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="max-w-2xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">
            {TASK_LABELS[taskType]} — timed set
          </h1>
          <p className="text-sm text-zinc-600">
            {EXAM_QUESTION_COUNT} questions, 25 minutes, no feedback until the
            end. You can move between questions freely.
          </p>
        </header>

        <div className="rounded-lg border border-zinc-300 bg-white p-5">
          <p className="mb-2 text-sm font-medium">Difficulty</p>
          <DifficultyPicker value={choice} onChange={setChoice} />
          <p className="mt-2 text-xs text-zinc-500">
            Random mixes low, medium and high across the set, which is closest to
            the real subtest.
          </p>
        </div>

        <RulesPanel taskType={taskType} defaultOpen />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={start}
            className="rounded-md bg-zinc-900 px-5 py-2.5 font-medium text-white"
          >
            Start 25:00 set
          </button>
          <Link
            href={`/practice/${TASK_SLUGS[taskType]}`}
            className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-zinc-700 hover:border-zinc-500"
          >
            Practice mode instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ExamRunner
      taskType={taskType}
      questions={questions}
      difficulty={choice === "random" ? "mixed" : choice}
      onRestart={() => {
        setQuestions([]);
        setPhase("setup");
      }}
    />
  );
}

function ExamRunner({
  taskType,
  questions,
  difficulty,
  onRestart,
}: {
  taskType: TaskType;
  questions: Question[];
  difficulty: "low" | "medium" | "high" | "mixed";
  onRestart: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>(() =>
    questions.map((q) => emptyAnswer(q)),
  );
  const [finished, setFinished] = useState(false);

  // Per-question time is accumulated as the test taker moves around, so the
  // recorded duration is time actually spent on that question.
  const timesRef = useRef<number[]>(questions.map(() => 0));
  const enteredAtRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const finishRef = useRef<() => void>(() => {});
  const [times, setTimes] = useState<number[]>(questions.map(() => 0));

  useEffect(() => {
    // Start the per-question clock once the set is actually on screen.
    enteredAtRef.current = performance.now();
    void createExamSession(taskType, difficulty, questions.length).then((id) => {
      sessionIdRef.current = id;
    });
  }, [taskType, difficulty, questions.length]);

  const flushCurrent = useCallback(() => {
    const now = performance.now();
    // Guard the very first flush, before the mount effect has set the origin.
    if (enteredAtRef.current > 0) {
      timesRef.current[index] += now - enteredAtRef.current;
    }
    enteredAtRef.current = now;
  }, [index]);

  const goTo = useCallback(
    (next: number) => {
      if (next === index || next < 0 || next >= questions.length) return;
      flushCurrent();
      setIndex(next);
    },
    [index, questions.length, flushCurrent],
  );

  const finish = useCallback(() => {
    if (finished) return;
    flushCurrent();
    setFinished(true);
    setTimes([...timesRef.current]);

    const sessionId = sessionIdRef.current;
    let correctCount = 0;
    questions.forEach((question, i) => {
      const isCorrect = gradeAnswer(question, answers[i]);
      if (isCorrect) correctCount++;
      void recordAttempt({
        taskType: question.taskType,
        difficulty: question.difficulty,
        seed: question.seed,
        isCorrect,
        durationMs: timesRef.current[i],
        answer: answers[i],
        sessionId,
      });
    });

    const total = timesRef.current.reduce((sum, value) => sum + value, 0);
    if (sessionId) void finishExamSession(sessionId, correctCount, total);
  }, [answers, finished, flushCurrent, questions]);

  // Kept in a ref so the countdown's expiry callback always calls the current
  // version, without tearing down and restarting the interval on every answer.
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const { remainingMs } = useCountdown(EXAM_DURATION_MS, () => {
    finishRef.current();
  });

  if (finished) {
    return (
      <ExamResults
        taskType={taskType}
        questions={questions}
        answers={answers}
        times={times}
        onRestart={onRestart}
      />
    );
  }

  const question = questions[index];
  const lowOnTime = remainingMs < 2 * 60 * 1000;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{TASK_LABELS[taskType]}</h1>
          <p className="text-sm text-zinc-600">
            Question {index + 1} of {questions.length} · {question.difficulty}
          </p>
        </div>
        <div
          className={`rounded-md border px-4 py-2 font-mono text-2xl font-semibold tabular-nums ${
            lowOnTime
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-zinc-300 bg-white"
          }`}
          role="timer"
          aria-label="Time remaining"
        >
          {formatDuration(remainingMs)}
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5" aria-label="Question navigator">
        {questions.map((_, i) => {
          const answered = isAnswerComplete(questions[i], answers[i]);
          return (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === index}
              className={`h-8 w-8 rounded border text-sm tabular-nums ${
                i === index
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : answered
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-zinc-300 bg-white text-zinc-600"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>

      <RulesPanel taskType={taskType} />

      <section className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 sm:p-6">
        <QuestionSurface
          question={question}
          answer={answers[index]}
          onAnswer={(next) =>
            setAnswers((current) => {
              const copy = [...current];
              copy[index] = next;
              return copy;
            })
          }
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 disabled:opacity-40"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === questions.length - 1}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 disabled:opacity-40"
        >
          Next →
        </button>
        <SeedBadge seed={question.seed} compact />
        <button
          type="button"
          onClick={finish}
          className="ml-auto rounded-md bg-blue-700 px-5 py-2.5 font-medium text-white"
        >
          Finish set
        </button>
      </div>
    </div>
  );
}

function ExamResults({
  taskType,
  questions,
  answers,
  times,
  onRestart,
}: {
  taskType: TaskType;
  questions: Question[];
  answers: QuestionAnswer[];
  times: number[];
  onRestart: () => void;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const results = questions.map((question, i) => ({
    question,
    correct: gradeAnswer(question, answers[i]),
    answered: isAnswerComplete(question, answers[i]),
    durationMs: times[i] ?? 0,
  }));
  const correctCount = results.filter((r) => r.correct).length;
  const totalMs = times.reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">
          {TASK_LABELS[taskType]} — set complete
        </h1>
        <p className="text-sm text-zinc-600">
          {correctCount} of {questions.length} correct · {formatDuration(totalMs)}{" "}
          spent answering
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-300 bg-white p-4">
          <p className="text-sm text-zinc-500">Score</p>
          <p className="text-4xl font-semibold">
            {correctCount}/{questions.length}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-300 bg-white p-4">
          <p className="text-sm text-zinc-500">Average per question</p>
          <p className="text-4xl font-semibold tabular-nums">
            {formatSeconds(totalMs / Math.max(1, questions.length))}
          </p>
          <p className="text-xs text-zinc-500">exam pace is 75 s</p>
        </div>
        <div className="rounded-lg border border-zinc-300 bg-white p-4">
          <p className="text-sm text-zinc-500">Unanswered</p>
          <p className="text-4xl font-semibold">
            {results.filter((r) => !r.answered).length}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-300 bg-white">
        <h2 className="px-4 pt-4 text-sm font-semibold text-zinc-700">
          Every question — open one to see its solution path
        </h2>
        <ul className="mt-2 divide-y divide-zinc-100">
          {results.map((result, i) => (
            <li key={result.question.seed}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-50"
              >
                <span className="w-6 tabular-nums text-zinc-500">{i + 1}</span>
                <span
                  className={
                    result.correct
                      ? "font-medium text-emerald-700"
                      : "font-medium text-red-600"
                  }
                >
                  {result.correct ? "correct" : result.answered ? "wrong" : "skipped"}
                </span>
                <span className="capitalize text-zinc-600">
                  {result.question.difficulty}
                </span>
                <span
                  className={`tabular-nums ${
                    result.durationMs > EXAM_PACE_MS
                      ? "text-amber-700"
                      : "text-zinc-500"
                  }`}
                >
                  {formatSeconds(result.durationMs)}
                </span>
                <span className="ml-auto font-mono text-xs text-zinc-500">
                  {result.question.seed}
                </span>
              </button>

              {open === i && (
                <div className="space-y-4 border-t border-zinc-100 bg-zinc-50 p-4">
                  <QuestionSurface
                    question={result.question}
                    answer={answers[i]}
                    onAnswer={() => {}}
                    disabled
                    showResult
                  />
                  <ExplanationPanel
                    question={result.question}
                    correct={result.correct}
                  />
                  <SeedBadge seed={result.question.seed} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md bg-zinc-900 px-5 py-2.5 font-medium text-white"
        >
          New set
        </button>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-zinc-700 hover:border-zinc-500"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Only ever on the results screen — never while the countdown runs. */}
      <SupportCallout
        reason={`You just sat ${questions.length} questions under exam pace and scored ${correctCount}. If this trainer is doing its job, a coffee is a lovely way to say so.`}
      />
    </div>
  );
}
