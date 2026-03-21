"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";

const room = {
  title: "DCPS Cellphone Ban: Safety vs Access in Schools",
  meta: "5 contributors • 2-day structured discussion",
  contributors: [
    { name: "Dr. Maya Reynolds", title: "Education Policy Analyst" },
    { name: "James Carter", title: "DC Public High School Teacher" },
    { name: "Alicia Gomez", title: "Parent Advocate" },
    { name: "Tyler Brooks", title: "Youth Policy Researcher" },
    { name: "Danielle Kim", title: "Former School Administrator" },
  ],
  summary:
    "DC Public Schools are considering stricter cellphone restrictions to improve focus and safety, but the policy raises concerns around emergency communication, enforcement, and equity. Contributors agree that current usage is disruptive, but differ on how far restrictions should go and who should be responsible for enforcing them.",
  takeaways: [
    "Full bans are easier to enforce but risk cutting off critical communication during emergencies.",
    "Partial restriction models introduce flexibility but depend heavily on teacher capacity and consistency.",
    "Technology-based solutions can support enforcement but raise cost and equity concerns.",
  ],
  disagreements: [
    "Enforcement responsibility: teachers, administrators, or technology.",
    "Parent access during school hours and emergency communication expectations.",
    "Whether restrictions should apply all day or only during instructional time.",
    "Whether violations should trigger punishment or loss-of-privilege systems.",
  ],
  solution: `Efforts to restrict cellphone use in DC Public Schools reflect a broader tension between maintaining focused learning environments and preserving open lines of communication between students and families. While contributors agreed that unregulated phone use has become a persistent disruption in classrooms, there was less alignment on how far schools should go in limiting access.

From a policy perspective, a full ban offers clarity. It is simple to communicate and, in theory, easier to enforce. However, several contributors noted that simplicity does not guarantee effectiveness. Enforcement ultimately depends on school-level capacity, and when responsibility falls unevenly on teachers, policies risk becoming inconsistent and, over time, ineffective.

At the same time, the role of cellphones as a communication tool cannot be ignored. Parents expressed concern about losing direct access to their children during emergencies, particularly in light of recent school safety incidents. Routing all communication through school offices may address this concern in theory, but only if those systems are fast, reliable, and trusted.

More flexible approaches, such as restricting phone use during instructional time while allowing access during breaks, were seen as a potential middle ground. However, these models introduce their own challenges. Without clear boundaries and enforcement mechanisms, partial restrictions can become difficult to manage, placing additional burden on already stretched staff.

Technology-based solutions, including locking pouches, were discussed as a way to support enforcement while reducing the need for constant monitoring. Yet these approaches raise important equity questions. Not all schools are equally positioned to adopt such tools, and uneven implementation could widen existing disparities.

Taken together, contributors leaned toward a hybrid model that prioritizes instructional focus while preserving limited access during non-instructional periods. This approach would need to be supported by clearly defined enforcement roles, investment in school communication systems, and safeguards to ensure consistent application across schools.

Ultimately, the success of any policy will depend less on its design and more on its execution. Without clarity, consistency, and trust from both educators and families, even well-intentioned restrictions are unlikely to achieve their intended impact.`,
  conversation: [
    {
      speaker: "Dr. Reynolds",
      text: "A full ban is attractive from a policy standpoint because it is simple. But the moment enforcement becomes inconsistent, the policy loses legitimacy.",
    },
    {
      speaker: "Carter",
      text: "That is exactly the issue. If it falls on teachers, it becomes another thing we are responsible for managing every period, and it is not realistic without support.",
    },
    {
      speaker: "Gomez",
      text: "I understand the distraction piece, but as a parent, I need to know I can reach my child. That is not hypothetical anymore.",
    },
    {
      speaker: "Kim",
      text: "We have seen schools try partial bans, but without clear systems, students just push boundaries. You need structure or it becomes a constant negotiation.",
    },
    {
      speaker: "Brooks",
      text: "There is also a generational piece here. Students do not separate their digital and physical lives the way policies often assume.",
    },
  ],
};

export default function RoomDetailPage() {
  const [tab, setTab] = useState<"solution" | "conversation">("solution");
  const paragraphs = useMemo(() => room.solution.split("\n\n"), []);

  return (
    <AppShell title="Room">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{room.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{room.meta}</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {room.contributors.map((person) => (
            <button
              key={person.name}
              type="button"
              className="shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-2 text-left"
            >
              <div className="text-sm font-medium text-slate-900">{person.name}</div>
              <div className="text-xs text-slate-500">{person.title}</div>
            </button>
          ))}
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{room.summary}</p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key Takeaways</div>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
            {room.takeaways.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key Points of Disagreement</div>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
            {room.disagreements.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-card)] border border-neutral-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("solution")}
            className={`rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium ${
              tab === "solution" ? "bg-neutral-900 text-white" : "text-slate-600"
            }`}
          >
            Solution
          </button>
          <button
            type="button"
            onClick={() => setTab("conversation")}
            className={`rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium ${
              tab === "conversation" ? "bg-neutral-900 text-white" : "text-slate-600"
            }`}
          >
            Conversation
          </button>
        </div>

        {tab === "solution" ? (
          <article className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-4 text-[15px] leading-7 text-slate-700 shadow-sm">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className={index === 0 ? "" : "mt-5"}>
                {paragraph}
              </p>
            ))}
          </article>
        ) : (
          <div className="space-y-3">
            {room.conversation.map((message, index) => (
              <div
                key={`${message.speaker}-${index}`}
                className="rounded-[var(--radius-card)] border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-slate-900">{message.speaker}</div>
                <p className="mt-1 text-sm leading-6 text-slate-700">{message.text}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-[var(--radius-card)] border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-center">
          <div className="text-sm font-medium text-slate-900">Create your own take on this topic</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm">
            <a href="/create" className="underline">
              Write a Flip
            </a>
            <a href="/people" className="underline">
              Start a People Deck
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
