"use client";

import Link from "next/link";

function Card(props: {
  title: string;
  description: string;
  href: string;
  cta: string;
  badge?: string;
}) {
  const { title, description, href, cta, badge } = props;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

export default function TutorialHubClient() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Tutorial</div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Explore Flipside (hands-on)
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              This is a clickable tour of the platform. You can move through the MVP and People Mode without shipping the real product.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm underline text-slate-700">
              Back to Add Flip
            </Link>
            <Link href="/feed" className="text-sm underline text-slate-700">
              Back to Feed
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          <Card
            title="MVP Tutorial"
            badge="Mock / Sandbox"
            description="Walk through the core MVP experience: add a flip, explore the five lenses, vote, reply, and share a lens — using demo content."
            href="/tutorial/mvp/add"
            cta="Start MVP tutorial →"
          />

          <Card
            title="People Mode Tutorial"
            badge="Prototype"
            description="Build a People Mode deck (anchor + 5 locked matches), then publish it and start a Room."
            href="/tutorial/people"
            cta="Start People Mode tutorial →"
          />

        </div>
      </div>
    </div>
  );
}
