export type RewriteLensId = "opposite" | "cynical" | "playful" | "bridge" | "calm";

export type RewriteSet = Record<RewriteLensId, string>;

export type RewriteRegressionFixture = {
  id: string;
  formatTags: string[];
  original: string;
  desired: RewriteSet;
};

export const REWRITE_REGRESSION_FIXTURES: RewriteRegressionFixture[] = [
  {
    id: "flock_repeated_list",
    formatTags: ["repeated-list", "policy", "line-breaks"],
    original: [
      "We don’t need Flock cameras.",
      "We don’t need data centers.",
      "We need clean produce.",
      "We need higher wages.",
      "We need clean water.",
    ].join("\n"),
    desired: {
      opposite: [
        "We do need Flock cameras.",
        "We do need data centers.",
        "We still need clean produce.",
        "We still need higher wages.",
        "We still need clean water.",
        "Progress and basic needs aren’t mutually exclusive.",
      ].join("\n"),
      cynical: [
        "We need Flock contracts.",
        "We need data-center tax breaks.",
        "Clean produce can wait.",
        "Higher wages can wait.",
        "Clean water can wait.",
        "The ribbon-cutting photos are already scheduled.",
      ].join("\n"),
      playful: [
        "No clean water.",
        "No decent wages.",
        "But the parking lot camera can identify your emotional support bumper sticker in 4K.",
        "Innovation!",
      ].join("\n"),
      bridge: [
        "People want safer streets.",
        "People want modern infrastructure.",
        "People also want clean produce.",
        "People also want higher wages.",
        "People also want clean water.",
        "The fight is over which needs keep getting called urgent.",
      ].join("\n"),
      calm: [
        "Cameras are a choice.",
        "Data centers are a choice.",
        "Clean produce is a need.",
        "Higher wages are a need.",
        "Clean water is a need.",
        "Budgets reveal the difference.",
      ].join("\n"),
    },
  },
  {
    id: "ban_everything_bullets",
    formatTags: ["bullets", "cultural", "emphatic"],
    original: [
      "• Ban gas stoves",
      "• Ban cars",
      "• Ban meat",
      "• Then act shocked when working people stop listening",
    ].join("\n"),
    desired: {
      opposite: [
        "• Regulate products that poison the air",
        "• Build places where driving isn’t mandatory",
        "• Stop subsidizing industrial meat forever",
        "• Then act shocked when ‘working people’ are used as cover for every profitable status quo",
      ].join("\n"),
      cynical: [
        "• Turn climate policy into a culture-war prop",
        "• Let lobbyists write the scary version",
        "• Put a working-class costume on it",
        "• Fundraise off the backlash",
      ].join("\n"),
      playful: [
        "• Touch thermostat",
        "• Lose truck",
        "• Government confiscates cheeseburger",
        "• Local man bravely survives a policy memo",
      ].join("\n"),
      bridge: [
        "• One group hears cleaner air",
        "• Another hears higher bills",
        "• One group sees transition",
        "• Another sees people with options redesigning life for people without them",
      ].join("\n"),
      calm: [
        "• Costs matter",
        "• Health matters",
        "• Infrastructure matters",
        "• Policy fails when the people carrying the transition only hear contempt",
      ].join("\n"),
    },
  },
  {
    id: "tax_them_all_caps",
    formatTags: ["all-caps", "political", "short"],
    original: "THE BILLIONAIRES ARE NOT GOING TO SAVE YOU. TAX THEM.",
    desired: {
      opposite: "THE GOVERNMENT IS NOT GOING TO SAVE YOU EITHER. STOP TREATING SUCCESS LIKE CONTRABAND.",
      cynical: "THE BILLIONAIRES WILL SURVIVE THE TAX. THEIR ACCOUNTANTS WROTE THE EXITS.",
      playful: "THE BILLIONAIRES ARE VERY SORRY. THEIR APOLOGY IS CURRENTLY DOCKED IN MONACO.",
      bridge: "PEOPLE AREN’T FIGHTING ABOUT ENVY. THEY’RE FIGHTING ABOUT WHO OWES WHAT TO THE SYSTEM THAT MADE THEM RICH.",
      calm: "EXTREME WEALTH IS POWER. THE QUESTION IS HOW MUCH OF THAT POWER A DEMOCRACY IS WILLING TO LEAVE UNCHECKED.",
    },
  },
  {
    id: "pronouns_insult",
    formatTags: ["one-line-insult", "cultural", "direct"],
    original: "Your pronouns are not a personality.",
    desired: {
      opposite: "Your irritation with someone else’s pronouns is not a personality either.",
      cynical: "Online identity fights are perfect because everyone gets status and nobody has to change material conditions.",
      playful: "Breaking: tiny words continue to ruin the entire week of extremely resilient adults.",
      bridge: "One person hears basic respect; another hears a compulsory identity script. That’s why two words carry a whole culture war.",
      calm: "Pronouns are ordinary language carrying extraordinary political weight because trust has already collapsed.",
    },
  },
  {
    id: "police_homelessness_question",
    formatTags: ["question", "policy", "progressive"],
    original: "Why are we pretending police can solve homelessness?",
    desired: {
      opposite: "Why are we pretending neighborhoods should absorb every consequence while the housing system gets fixed someday?",
      cynical: "Why solve homelessness when you can fund the part that moves it out of the camera frame?",
      playful: "Did we lose the part of the police academy where they teach zoning reform, psychiatric care, and affordable housing construction?",
      bridge: "What are residents supposed to do with immediate disorder while unhoused people wait for solutions that never arrive?",
      calm: "Police can respond to incidents. They cannot manufacture homes, treatment capacity, or long-term stability.",
    },
  },
  {
    id: "governor_crime_quote",
    formatTags: ["quotation", "source-attributed", "dry-factual"],
    original: "Governor Lee: “Crime is down 18% this year.”",
    desired: {
      opposite: "Governor Lee: “Tell that to the people who no longer feel safe enough to believe the spreadsheet.”",
      cynical: "Governor Lee: “Crime is down 18% this year.”\nTranslation: the reelection graphic cleared legal review.",
      playful: "Governor Lee: “Crime is down 18% this year.”\nCrime: please respect our rebrand during this exciting transition.",
      bridge: "Governor Lee: “Crime is down 18% this year.”\nA falling rate and a frightened public can both be real at the same time.",
      calm: "Governor Lee: “Crime is down 18% this year.”\nThe useful questions are which crimes, where, compared with when, and whether the decline is lasting.",
    },
  },
  {
    id: "congress_deadline_joke",
    formatTags: ["short-joke", "institutional", "quotation"],
    original: "Congress saw a deadline and said, ‘what if we made it a hostage situation?’",
    desired: {
      opposite: "Congress saw a deadline and said, ‘what if this were the only moment anyone had leverage?’",
      cynical: "Congress saw a deadline and remembered panic gets more airtime than governing.",
      playful: "Congress treats deadlines the way toddlers treat bedtime: suddenly every unresolved issue is a human-rights emergency.",
      bridge: "Congressional deadlines become hostage situations because compromise feels like surrender until the cost of failure is visible.",
      calm: "A deadline is supposed to force a decision. Congress uses it to postpone responsibility until panic makes the decision for them.",
    },
  },
  {
    id: "school_parent_rant",
    formatTags: ["long-rant", "education", "cultural"],
    original: "Everyone keeps telling parents to trust the experts, but the experts never have to live with the consequences. They redesign the curriculum, lower the standards, rename the failure, and move on to the next conference. Then they act offended when families notice their kids can’t read.",
    desired: {
      opposite: "Everyone keeps telling teachers to trust parents, but the loudest parents rarely have to run a classroom. They demand higher standards, reject the supports that make them possible, attack every professional judgment, and move on to the next outrage. Then they act shocked when educators leave.",
      cynical: "The system works beautifully for everyone who gets promoted for announcing the reform. Consultants get a framework, administrators get a conference, politicians get a slogan, and the kid who still can’t read gets another renamed intervention.",
      playful: "Education reform is incredible. First we change the standards, then the test, then the dashboard, then the vocabulary, and eventually the child’s inability to read becomes a very promising implementation challenge.",
      bridge: "Parents are protecting their children from a system that can hide failure behind expertise. Educators are protecting classrooms from demands that ignore what teaching actually requires. Neither side trusts the other’s definition of accountability anymore.",
      calm: "The durable issue is whether students can read and whether adults can tell the truth when they cannot. Credentials, parental anger, new terminology, and institutional defensiveness all become distractions when outcomes stay weak.",
    },
  },
];
