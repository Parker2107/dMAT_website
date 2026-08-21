import Link from "next/link";

import { SUPPORT_HREF } from "@/lib/support";

/**
 * The "Buy me a coffee?" nudge, in the two shapes the app needs.
 *
 * Deliberately not a client component and deliberately never rendered inside a
 * live question: the callouts sit on the dashboard, on the resources page and
 * on end-of-set screens, where the user is already reading their results.
 */
export function SupportCallout({
  variant = "card",
  reason,
}: {
  variant?: "card" | "inline";
  /** Replaces the default lead-in, so each placement can speak to its moment. */
  reason?: string;
}) {
  const lead =
    reason ??
    "If this trainer moved your scores, you can send me a coffee over UPI.";

  if (variant === "inline") {
    return (
      <p className="text-sm text-zinc-600">
        {lead}{" "}
        <Link href={SUPPORT_HREF} className="text-blue-700 underline">
          Buy me a coffee?
        </Link>
      </p>
    );
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="min-w-[16rem] flex-1">
        <h2 className="font-semibold text-amber-900">Buy me a coffee?</h2>
        <p className="mt-1 text-sm text-amber-900/80">{lead}</p>
      </div>
      <Link
        href={SUPPORT_HREF}
        className="rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white"
      >
        Sure ☕
      </Link>
    </section>
  );
}
