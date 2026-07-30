import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);
const assert = (condition, message) => (condition ? pass(message) : fail(message));

const files = {
  contract: "src/lib/flipRewriteContract.ts",
  engine: "src/lib/flipRewriteEngine.ts",
  fixtures: "src/lib/flipRewriteFixtures.ts",
  mainRoute: "src/app/api/flip/route.ts",
  shareRoute: "src/app/api/share-extension/flip/route.ts",
  timelines: "src/theme/timelines.ts",
  webDeck: "src/components/SwipeDeck.tsx",
  webShare: "src/app/share/[postId]/page.client.tsx",
};

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const engineScope = [
  source.contract,
  source.engine,
  source.mainRoute,
  source.shareRoute,
  source.timelines,
].join("\n");

assert(source.mainRoute.includes('from "@/lib/flipRewriteEngine"'), "main route uses the shared rewrite engine");
assert(source.shareRoute.includes('from "@/lib/flipRewriteEngine"'), "share-extension route uses the shared rewrite engine");
assert(source.mainRoute.includes("generateFlipRewrites"), "main route runs shared candidate generation and selection");
assert(source.shareRoute.includes("generateFlipRewrites"), "share-extension route runs shared candidate generation and selection");
assert(source.contract.includes('DEFAULT_REWRITE_MODEL = "gpt-5.6-sol"'), "shared default model is gpt-5.6-sol");
assert(!source.mainRoute.includes("gpt-4.1-mini") && !source.shareRoute.includes("gpt-4.1-mini"), "legacy route model is gone");
assert(source.contract.includes("CANDIDATES_PER_LENS = 3"), "candidate count is fixed at three per lens");
assert(source.contract.includes("minItems: CANDIDATES_PER_LENS") && source.contract.includes("maxItems: CANDIDATES_PER_LENS"), "candidate schema requires exactly three items");
assert(source.engine.includes("Promise.allSettled"), "lens candidate calls run in parallel");
assert(source.engine.includes("rankAllCandidates") && source.engine.includes("flipside_batched_candidate_ranking"), "all candidates use one batched selector");
assert(!engineScope.includes('type: "json_object"'), "legacy JSON object mode is gone");
assert(engineScope.includes('type: "json_schema"') && engineScope.includes("strict: true"), "strict Structured Outputs are enabled");
assert(!engineScope.includes("RAZOR_EDGE_REWRITE_SYSTEM_PROMPT"), "legacy route prompt is gone");
assert(!source.shareRoute.includes("buildPrompt("), "one-shot share-extension prompt is gone");

const removedConstraints = [
  ["Do not", "fabricate", "supporting", "evidence"].join(" "),
  ["not", "criticize", "the", "original's", "wording"].join(" "),
  ["not", "criticize", "the", "original’s", "wording"].join(" "),
  ["without", "inventing", "facts"].join(" "),
  ["factually", "defensible"].join(" "),
  ["do not", "introduce", "unsupported", "claims"].join(" "),
  ["reject", "invented", "implications"].join(" "),
  ["penalize", "questionable", "factual", "claims"].join(" "),
  ["only", "use", "facts", "contained", "in", "the", "source"].join(" "),
  ["factual", "drift"].join(" "),
  ["factual", "boundaries"].join(" "),
  ["invented", "facts"].join(" "),
  ["without", "inventing", "secret", "facts"].join(" "),
];
const normalizedScope = engineScope.toLowerCase();
const returnedConstraint = removedConstraints.find((phrase) => normalizedScope.includes(phrase.toLowerCase()));
assert(!returnedConstraint, returnedConstraint ? `removed constraint returned: ${returnedConstraint}` : "removed factuality constraints remain absent");

assert(source.contract.includes("Rhetorical and structural fidelity"), "selector prioritizes rhetorical structure first");
assert(source.contract.includes("Believable native social-media voice"), "selector prioritizes native social voice");
assert(source.contract.includes("Do not consistently choose the safest candidate"), "selector is instructed not to default to safety");
assert(source.contract.includes("Bridge does not need to declare both positions equally valid"), "Bridge is not compulsory compromise");
assert(source.contract.includes("Calm is not automatically centrist"), "Calm is cold clarity rather than automatic centrism");
assert(source.fixtures.match(/id:\s*"/g)?.length >= 8, "at least eight mixed-format regression fixtures exist");
assert(source.fixtures.includes('["repeated-list", "policy", "line-breaks"]'), "repeated-list formatting fixture exists");
assert(source.fixtures.includes('.join("\\n")'), "fixtures preserve explicit line breaks");
assert(source.engine.includes("normalizeNewlines") && !source.engine.includes('.replace(/\\s+/g, " ")'), "engine preserves newline structure");
assert(source.contract.includes("FORMAT IS A FIRST-CLASS REQUIREMENT"), "format preservation is mandatory in the shared contract");
assert(source.engine.includes("analyzeRhetoricalShell"), "engine derives an explicit rhetorical shell");
assert(source.engine.includes("assessStructuralFidelity"), "candidate structure is scored before selection");
assert(source.engine.includes("candidate_regeneration"), "engine retries a lens when every candidate flattens the source format");
assert(source.engine.includes("structureMatch") && source.engine.includes("structureScore"), "selector receives deterministic structure assessments");
assert(source.engine.includes("observedModel") && source.mainRoute.includes("observedModels"), "runtime records the model returned by OpenAI");
assert(source.contract.includes("REWRITE_PROMPT_FINGERPRINT") && source.mainRoute.includes("promptFingerprint"), "runtime exposes the exact prompt fingerprint");
assert(source.webDeck.includes("whitespace-pre-wrap"), "web deck renders preserved line breaks");
assert(source.webShare.includes("whitespace-pre-wrap"), "public share page renders preserved line breaks");

const stalePromptBackups = [
  "src/app/api/flip/route.ts.bak-razor-edge-prompt",
  "src/app/api/flip/route.ts.bak-razor-edge-examples-prompt",
  "src/app/api/share-extension/flip/route.ts.bak-razor-edge-prompt",
  "src/app/api/share-extension/flip/route.ts.bak-razor-edge-examples-prompt",
  "src/app/api/share-extension/flip/route.ts.bak-persist-share-extension-deck",
].filter((file) => fs.existsSync(path.join(root, file)));
assert(stalePromptBackups.length === 0, "unused legacy prompt backups are removed");

if (process.exitCode) {
  console.error("\nRewrite-engine audit failed.");
  process.exit(process.exitCode);
}

console.log("\nRewrite-engine audit passed.");
