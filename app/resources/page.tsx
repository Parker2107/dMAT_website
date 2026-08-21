import Link from "next/link";

import { SupportCallout } from "@/components/SupportCallout";
import { RESOURCE_GROUPS } from "@/lib/resources";

export const metadata = {
  title: "Official links · dMAT Trainer",
};

/** Hostname only, so each button shows where it actually goes. */
function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export default function ResourcesPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Official links</h1>
        <p className="mt-1 text-sm text-zinc-600">
          The authoritative dMAT sources. Everything here opens on the official
          site in a new tab — nothing is hosted or mirrored by this app.
        </p>
      </header>

      {RESOURCE_GROUPS.map((group) => (
        <section key={group.heading} className="space-y-3">
          <div>
            <h2 className="font-semibold">{group.heading}</h2>
            <p className="text-sm text-zinc-600">{group.blurb}</p>
          </div>

          <ul className="space-y-3">
            {group.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-zinc-300 bg-white p-4 transition-colors hover:border-zinc-500"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-blue-800 underline">
                      {link.title}
                    </span>
                    <span className="rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
                      {link.kind}
                    </span>
                    <span className="ml-auto text-xs text-zinc-500">
                      {hostOf(link.href)} ↗
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    {link.description}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-lg border border-zinc-300 bg-white p-4 text-sm text-zinc-600">
        <p>
          These pages are the authoritative source. Where this trainer&rsquo;s{" "}
          <Link href="/rules" className="text-blue-700 underline">
            rules pages
          </Link>{" "}
          differ from them, trust the official materials — and please tell me, so
          the generators can be corrected.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          This is an unofficial project, not affiliated with or endorsed by
          g.a.s.t. or the TestDaF-Institut.
        </p>
      </section>

      <SupportCallout variant="inline" />
    </div>
  );
}
