import Image from "next/image";
import Link from "next/link";

import {
  CONTACT_EMAIL,
  UPI_DEEP_LINK,
  UPI_ID,
  UPI_QR_SRC,
} from "@/lib/support";

export const metadata = {
  title: "Buy me a coffee? · dMAT Trainer",
  description:
    "If the dMAT Trainer drills helped your scores, you can send a small thank-you over UPI.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Buy me a coffee?</h1>
        <p className="mt-1 text-sm text-zinc-600">
          This trainer is free, has no ads, and never asks you to sign up for
          anything beyond the login that stores your own attempts. I built it
          because the official prep pack ships six exercises per task type,
          which is nowhere near enough practice.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-300 bg-white p-6">
        <p className="text-sm text-zinc-700">
          If the drills here moved your numbers — faster median times, fewer
          wrong answers, a calmer run at the real thing — a coffee is a lovely
          way to say so. Any amount, entirely optional.
          {UPI_ID !== null
            ? " Scan the code, or copy the UPI ID underneath it."
            : " Scan the code with any UPI app."}
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
          {/* `fill` + object-contain, so swapping in a QR of any size, aspect
              ratio or format needs no code change. Unoptimized serves the file
              byte-for-byte, keeping the modules crisp for the scanner. */}
          <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-md border border-zinc-200">
            <Image
              src={UPI_QR_SRC}
              alt="UPI QR code for sending a tip"
              fill
              sizes="280px"
              unoptimized
              preload
              className="object-contain"
            />
          </div>

          {UPI_ID !== null && (
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                UPI ID
              </p>
              <p className="mt-1 select-all font-mono text-lg font-semibold text-zinc-900">
                {UPI_ID}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Tap to select, then copy it into any UPI app.
              </p>
            </div>
          )}

          {UPI_DEEP_LINK !== null && (
            <>
              <a
                href={UPI_DEEP_LINK}
                className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
              >
                Open in a UPI app
              </a>
              <p className="text-xs text-zinc-500">
                That button only does something on a phone with a payment app
                installed. On a laptop, scan the code instead.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-300 bg-white p-4">
        <h2 className="font-semibold">Or just say hello</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Bug reports, a generator that produces something the official rules
          would not, or a note that the app helped — all equally welcome, and
          the second one is genuinely more useful to me than money.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
            "dMAT Trainer",
          )}`}
          className="mt-2 inline-block font-mono text-sm text-blue-700 underline"
        >
          {CONTACT_EMAIL}
        </a>
      </section>

      <p className="text-xs text-zinc-500">
        Nothing here unlocks features — every question type, the exam mode and
        your{" "}
        <Link href="/" className="text-blue-700 underline">
          dashboard
        </Link>{" "}
        stay exactly the same whether you send anything or not. Payments go
        straight to my UPI account; this app stores no payment details and has
        no idea whether you sent anything.
      </p>
    </div>
  );
}
