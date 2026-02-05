import type { MockAuthor, MockPost } from "./types";
import type { TimelineId } from "@/theme/timelines";

const AUTHORS: MockAuthor[] = [
  { id: "u_ethan", name: "Ethan Downs", handle: "ethan" },
  { id: "u_parker", name: "Parker Bishop", handle: "Data992" },
  { id: "u_jules", name: "Jules", handle: "jules" },
  { id: "u_kira", name: "Kira", handle: "kira" },
  { id: "u_sana", name: "Sana", handle: "sana" },
  { id: "u_miles", name: "Miles", handle: "miles" },
  { id: "u_lea", name: "Lea", handle: "lea" },
  { id: "u_quinn", name: "Quinn", handle: "quinn" },
  { id: "u_riley", name: "Riley", handle: "riley" },
  { id: "u_casey", name: "Casey", handle: "casey" },
  { id: "u_micah", name: "Micah", handle: "micah" },
  { id: "u_reese", name: "Reese", handle: "reese" },
];

export const TOPICS: Array<{ id: string; label: string; anchor: string }> = [
  {
    id: "t01",
    label: "School cell phone ban",
    anchor:
      "We should ban phones in schools. It’s wrecking attention and learning.",
  },
  {
    id: "t02",
    label: "TikTok ban / national security",
    anchor:
      "Banning an app because it’s popular is not ‘national security.’ Make your case or back off.",
  },
  {
    id: "t03",
    label: "Immigration & asylum",
    anchor:
      "We can be humane and still have a real border policy. Chaos helps nobody.",
  },
  {
    id: "t04",
    label: "Student loan relief",
    anchor:
      "Student debt relief without cost controls is a band-aid that guarantees higher tuition next.",
  },
  {
    id: "t05",
    label: "Police funding & safety",
    anchor:
      "You can demand accountability AND expect public safety. Those aren’t opposites.",
  },
  {
    id: "t06",
    label: "AI in hiring",
    anchor:
      "If your hiring tool is a black box, you’re just automating bias at scale.",
  },
  {
    id: "t07",
    label: "Housing affordability",
    anchor:
      "If you want affordable housing, you can’t block every new building and pretend math doesn’t exist.",
  },
  {
    id: "t08",
    label: "Remote work backlash",
    anchor:
      "Forcing office attendance without a real reason is just management theater.",
  },
  {
    id: "t09",
    label: "Climate policy costs",
    anchor:
      "If climate policy bankrupts regular families, it will collapse politically. Design it better.",
  },
  {
    id: "t10",
    label: "Free speech & moderation",
    anchor:
      "Platforms can’t be ‘town squares’ and also ban anything that makes advertisers nervous.",
  },
  {
    id: "t11",
    label: "Kids & social media",
    anchor:
      "We regulate alcohol and tobacco for minors. Why is social media off-limits?",
  },
  {
    id: "t12",
    label: "Ukraine aid",
    anchor:
      "Endless aid without clear goals is a blank check. Define success and timelines.",
  },
  {
    id: "t13",
    label: "Healthcare pricing",
    anchor:
      "If prices are opaque and negotiated in backrooms, the system is rigged by design.",
  },
  {
    id: "t14",
    label: "Campus speech disputes",
    anchor:
      "Universities can’t claim to value inquiry and then punish unpopular opinions.",
  },
  {
    id: "t15",
    label: "Unionization wave",
    anchor:
      "If workers can’t afford rent on full-time pay, don’t be shocked they organize.",
  },
  {
    id: "t16",
    label: "Gun policy",
    anchor:
      "We need policy that reduces harm without pretending culture and rights don’t exist.",
  },
  {
    id: "t17",
    label: "Crypto regulation",
    anchor:
      "Treating crypto like magic money invites fraud. Regulate it like finance.",
  },
  {
    id: "t18",
    label: "Public transit vs cars",
    anchor:
      "If transit is unreliable, people will drive. Fix the service before shaming riders.",
  },
  {
    id: "t19",
    label: "DEI backlash",
    anchor:
      "If a program can’t survive sunlight and measurement, it’s politics, not policy.",
  },
  {
    id: "t20",
    label: "Election trust",
    anchor:
      "Democracy can’t run on vibes. Build trust with audits, transparency, and consequences for lies.",
  },
];

const LENSES: TimelineId[] = ["calm", "bridge", "cynical", "opposite", "playful"];

function pickAuthor(i: number) {
  return AUTHORS[i % AUTHORS.length];
}

function nowMinusDays(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function candidateText(topicLabel: string, lens: TimelineId, n: number) {
  const base = topicLabel;

  const CALM = [
    `A practical step: define the goal, pick a rule that’s enforceable, then measure outcomes.`,
    `Try a limited policy first (class hours only), then adjust with real feedback.`,
    `Start with clear expectations and consistent enforcement, not moral panic.`,
    `Keep it simple: fewer exceptions, clearer rules, better compliance.`,
    `Focus on outcomes (learning, safety, trust) and design around them.`,
    `If the rule creates worse incentives, it will fail. Iterate responsibly.`,
    `The best policy is one people can actually follow without constant conflict.`,
  ];

  const BRIDGE = [
    `I get the concern, but the other side worries about edge cases and enforcement burdens. Can we design a compromise?`,
    `Both sides want better outcomes. Try a policy with guardrails + a review window.`,
    `There’s a legit fear of overreach and a legit frustration with status quo. Build a middle path.`,
    `Combine structure with flexibility: clear defaults, limited exceptions, transparent metrics.`,
    `The hard part is enforcement. Pair the policy with resources so it’s not just a mandate.`,
    `If we agree on goals first, the implementation debate gets way less toxic.`,
    `Make it reversible: pilot it, publish results, then scale or stop.`,
  ];

  const CYNICAL = [
    `Hot take: we’ll argue forever and quietly keep doing whatever is easiest for administrators.`,
    `We love “big debates” right up until someone asks for data.`,
    `Nothing says “serious policy” like vibes + a press release.`,
    `Sure, let’s fix a structural issue by banning a rectangle. Problem solved.`,
    `The incentives are obvious: shift blame, avoid accountability, repeat.`,
    `We don’t have a system—we have a collection of excuses with logos.`,
    `If it’s not measured, it’s not real. If it is measured… people get mad.`,
  ];

  const OPPOSITE = [
    `Bans tend to backfire. Teach responsible use and build norms instead of confiscation culture.`,
    `Overreach creates resentment and noncompliance. Better to set boundaries than blanket bans.`,
    `If the problem is deeper than the tool, banning the tool won’t solve it.`,
    `The rule will be enforced unevenly. That’s the real risk.`,
    `Restrictions can help, but defaulting to bans ignores autonomy and legitimate needs.`,
    `Once you normalize bans, the boundary keeps moving. That’s dangerous.`,
    `The burden lands on the people with the least flexibility. Design for that.`,
  ];

  const PLAYFUL = [
    `Plot twist: ban phones and suddenly it’s 1997 in the hallway. Passing notes makes a comeback.`,
    `We ban phones, kids discover boredom, and society collapses within 48 hours.`,
    `Breaking: students forced to look out the window. Experts say “nature” is trending.`,
    `Phones are gone. Attention returns. Teachers immediately assign… 12 tabs of homework.`,
    `Policy idea: put phones in tiny sleep pods and whisper “rest now, little dopamine brick.”`,
    `If we ban everything distracting, we’ll just have to ban… thoughts. Good luck.`,
    `The real ban should be on “reply-all,” but nobody’s ready for that conversation.`,
  ];

  const pool =
    lens === "calm"
      ? CALM
      : lens === "bridge"
      ? BRIDGE
      : lens === "cynical"
      ? CYNICAL
      : lens === "opposite"
      ? OPPOSITE
      : PLAYFUL;

  const s = pool[n % pool.length];
  return `${s}\n\n(Responding to: ${base})`;
}

export function buildMockPosts(): MockPost[] {
  const posts: MockPost[] = [];
  let idCounter = 1;

  for (let t = 0; t < TOPICS.length; t++) {
    const topic = TOPICS[t];
    const anchorAuthor = pickAuthor(t);

    // Anchor-ish originals also exist as pool items so other decks can “use” them later.
    posts.push({
      id: `p_${idCounter++}`,
      text: topic.anchor,
      author: anchorAuthor,
      createdAt: nowMinusDays(1 + (t % 14)),
      sourceType: "original",
      topicId: topic.id,
      votes: 0,
      replies: [],
    });

    // Candidates per lens (5–7)
    for (const lens of LENSES) {
      const count = 5 + ((t + lens.length) % 3); // 5–7
      for (let n = 0; n < count; n++) {
        posts.push({
          id: `p_${idCounter++}`,
          text: candidateText(topic.label, lens, n),
          author: pickAuthor(t + n + lens.length),
          createdAt: nowMinusDays(2 + ((t + n) % 21)),
          sourceType: n % 4 === 0 ? "import-other" : "original",
          topicId: topic.id,
          lensLabel: lens,
          votes: 0,
          replies: [],
        });
      }
    }
  }

  return posts;
}

export function getTopicLabel(topicId: string) {
  return TOPICS.find((t) => t.id === topicId)?.label ?? "Topic";
}
