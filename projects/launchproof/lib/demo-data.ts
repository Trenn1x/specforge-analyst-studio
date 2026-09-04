import type { ReleaseCandidate, ReleaseGate } from "@/lib/types";

function evidence(
  id: string,
  label: string,
  actual: string,
  threshold: string,
  source: string,
  whyItMatters: string,
) {
  return {
    id,
    label,
    actual,
    threshold,
    source,
    timestamp: "2026-09-03T18:42:00.000Z",
    whyItMatters,
  };
}

const atlasGates: ReleaseGate[] = [
  {
    id: "build",
    label: "Build",
    shortLabel: "Build",
    status: "passed",
    result: "2m 43s",
    summary: "Reproducible production bundle completed on a clean runner.",
    weight: 12,
    automated: true,
    evidence: [
      evidence(
        "build-1",
        "Production build",
        "Completed in 2m 43s",
        "Under 5 minutes",
        "GitHub Actions · run 1842",
        "A clean build proves the release can be reproduced outside a developer laptop.",
      ),
      evidence(
        "build-2",
        "Artifact integrity",
        "SHA-256 recorded",
        "Digest required",
        "Artifact Registry",
        "A pinned digest keeps the reviewed artifact identical to the deployed artifact.",
      ),
    ],
  },
  {
    id: "tests",
    label: "Automated tests",
    shortLabel: "Tests",
    status: "warning",
    result: "428 / 430",
    summary: "Two flaky integration tests passed on retry and need ownership.",
    weight: 18,
    automated: true,
    evidence: [
      evidence(
        "tests-1",
        "Test suite",
        "428 passed; 2 passed on retry",
        "100% pass without retry",
        "Vitest + API integration suite",
        "Flaky tests erode trust in the signal even when the final run is green.",
      ),
      evidence(
        "tests-2",
        "Changed-line coverage",
        "92%",
        "At least 90%",
        "Coverage report",
        "Changed-line coverage focuses review on risk introduced by this release.",
      ),
    ],
  },
  {
    id: "security",
    label: "Security",
    shortLabel: "Security",
    status: "passed",
    result: "0 critical",
    summary: "No critical or high findings; one medium item has an accepted owner.",
    weight: 18,
    automated: true,
    evidence: [
      evidence(
        "security-1",
        "Dependency scan",
        "0 critical · 0 high · 1 medium",
        "No critical or high findings",
        "OSV scanner",
        "Release gates should distinguish blocking exposure from tracked remediation.",
      ),
      evidence(
        "security-2",
        "Secret scan",
        "No credentials detected",
        "Zero verified secrets",
        "Gitleaks",
        "Static deployments must never expose service credentials in their bundle.",
      ),
    ],
  },
  {
    id: "performance",
    label: "Performance",
    shortLabel: "Perf",
    status: "passed",
    result: "p95 184ms",
    summary: "API latency remains inside the agreed performance budget.",
    weight: 12,
    automated: true,
    evidence: [
      evidence(
        "performance-1",
        "API latency",
        "p95 184ms",
        "p95 below 220ms",
        "k6 smoke test · 10 min",
        "A percentile budget catches slow user experiences hidden by averages.",
      ),
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility",
    shortLabel: "A11y",
    status: "passed",
    result: "98 / 100",
    summary: "Keyboard, focus, contrast, and landmark checks passed.",
    weight: 10,
    automated: true,
    evidence: [
      evidence(
        "a11y-1",
        "Automated audit",
        "98 / 100",
        "At least 95",
        "Lighthouse CI",
        "Automated checks catch repeatable barriers before manual assistive-tech review.",
      ),
    ],
  },
  {
    id: "ai-eval",
    label: "AI evaluation",
    shortLabel: "AI eval",
    status: "passed",
    result: "93% · 120 cases",
    summary: "The model clears quality, refusal, and injection-resistance thresholds.",
    weight: 18,
    automated: true,
    evidence: [
      evidence(
        "ai-1",
        "Evaluation set",
        "112 of 120 accepted (93%)",
        "At least 90%",
        "Versioned eval set · evals/v4.jsonl",
        "A stable evaluation set turns model quality into a release criterion instead of a feeling.",
      ),
      evidence(
        "ai-2",
        "Prompt-injection suite",
        "24 of 24 resisted",
        "100% required",
        "Adversarial fixture set",
        "Security-sensitive AI behavior needs explicit failure cases and a hard threshold.",
      ),
    ],
  },
  {
    id: "approval",
    label: "Human approval",
    shortLabel: "Approval",
    status: "blocked",
    result: "Security pending",
    summary: "QA approved; security review is still required before deploy.",
    weight: 12,
    automated: false,
    evidence: [
      evidence(
        "approval-1",
        "Required reviewers",
        "QA approved · security pending",
        "QA and security approval",
        "Protected environment",
        "Automation can assemble evidence, but accountable people make the release decision.",
      ),
    ],
  },
];

const NIMBUS_TIME = "2026-09-03T16:20:00.000Z";
const RELAY_TIME = "2026-09-03T14:05:00.000Z";

function buildNimbusGate(gate: ReleaseGate): ReleaseGate {
  const evidence = gate.evidence.map((item) => ({ ...item, timestamp: NIMBUS_TIME }));

  if (gate.id === "tests") {
    return {
      ...gate,
      status: "passed",
      result: "430 / 430",
      summary: "The complete test suite passed on the first run.",
      evidence: evidence.map((item) =>
        item.id === "tests-1"
          ? { ...item, actual: "430 passed without retry" }
          : item,
      ),
    };
  }

  if (gate.id === "approval") {
    return {
      ...gate,
      status: "passed",
      result: "QA + security approved",
      summary: "QA and security approvals are recorded for this commit.",
      evidence: evidence.map((item) => ({
        ...item,
        actual: "Approved by QA and security",
        source: "Protected environment · named reviewers",
      })),
    };
  }

  return { ...gate, status: "passed", evidence };
}

function buildRelayGate(gate: ReleaseGate): ReleaseGate {
  const evidence = gate.evidence.map((item) => ({ ...item, timestamp: RELAY_TIME }));

  if (gate.id === "tests") {
    return {
      ...gate,
      status: "blocked",
      result: "401 / 430",
      summary: "Twenty-nine authorization integration tests are failing.",
      evidence: evidence.map((item) => {
        if (item.id === "tests-1") return { ...item, actual: "401 passed · 29 failed" };
        if (item.id === "tests-2") return { ...item, actual: "84%" };
        return item;
      }),
    };
  }

  if (gate.id === "ai-eval") {
    return {
      ...gate,
      status: "blocked",
      result: "82% · 120 cases",
      summary: "Quality and prompt-injection resistance are below policy thresholds.",
      evidence: evidence.map((item) =>
        item.id === "ai-1"
          ? { ...item, actual: "98 of 120 accepted (82%)" }
          : { ...item, actual: "22 of 24 resisted" },
      ),
    };
  }

  if (gate.id === "approval") {
    return {
      ...gate,
      status: "blocked",
      result: "Security pending",
      summary: "Human approval remains pending while automated blockers are resolved.",
      evidence,
    };
  }

  return { ...gate, evidence };
}

export const seedReleases: ReleaseCandidate[] = [
  {
    id: "atlas-270",
    product: "Atlas",
    version: "v2.7.0",
    commit: "8f3c9bd",
    branch: "release/2.7.0",
    environment: "staging",
    owner: "Nora Shah",
    changeRisk: "Medium",
    previousScore: 91,
    lastAssessed: "2026-09-03T18:42:00.000Z",
    gates: atlasGates,
    audit: [
      {
        id: "event-5",
        actor: "LaunchProof",
        action: "Completed assessment",
        detail: "Seven release gates evaluated against policy v3.2.",
        timestamp: "2026-09-03T18:42:00.000Z",
        kind: "automation",
      },
      {
        id: "event-4",
        actor: "Priya R.",
        action: "Approved QA gate",
        detail: "Acceptance criteria and regression plan reviewed.",
        timestamp: "2026-09-03T18:31:00.000Z",
        kind: "human",
      },
      {
        id: "event-3",
        actor: "Eval runner",
        action: "Published AI evaluation",
        detail: "120 fixtures executed against prompt bundle v14.",
        timestamp: "2026-09-03T18:18:00.000Z",
        kind: "automation",
      },
      {
        id: "event-2",
        actor: "GitHub Actions",
        action: "Built candidate",
        detail: "Artifact sha256:a84f…19bc published and attested.",
        timestamp: "2026-09-03T18:02:00.000Z",
        kind: "system",
      },
      {
        id: "event-1",
        actor: "Nora Shah",
        action: "Opened release",
        detail: "Release candidate created from 34 merged changes.",
        timestamp: "2026-09-03T17:54:00.000Z",
        kind: "human",
      },
    ],
  },
  {
    id: "nimbus-194",
    product: "Nimbus",
    version: "v1.9.4",
    commit: "64ad20e",
    branch: "release/1.9.4",
    environment: "production",
    owner: "Eli Mason",
    changeRisk: "Low",
    previousScore: 94,
    lastAssessed: NIMBUS_TIME,
    gates: atlasGates.map(buildNimbusGate),
    audit: [
      {
        id: "nimbus-2",
        actor: "LaunchProof",
        action: "Marked release ready",
        detail: "All required evidence and approvals are present.",
        timestamp: "2026-09-03T16:20:00.000Z",
        kind: "automation",
      },
      {
        id: "nimbus-1",
        actor: "Eli Mason",
        action: "Approved deployment",
        detail: "Rollback drill and production window confirmed.",
        timestamp: "2026-09-03T16:17:00.000Z",
        kind: "human",
      },
    ],
  },
  {
    id: "relay-420",
    product: "Relay",
    version: "v4.2.0",
    commit: "09d1ae7",
    branch: "release/4.2.0",
    environment: "staging",
    owner: "Cam Brooks",
    changeRisk: "High",
    previousScore: 83,
    lastAssessed: RELAY_TIME,
    gates: atlasGates.map(buildRelayGate),
    audit: [
      {
        id: "relay-2",
        actor: "LaunchProof",
        action: "Blocked release",
        detail: "Regression and AI-evaluation thresholds were not met.",
        timestamp: "2026-09-03T14:05:00.000Z",
        kind: "automation",
      },
      {
        id: "relay-1",
        actor: "Cam Brooks",
        action: "Opened release",
        detail: "High-risk authorization rewrite entered review.",
        timestamp: "2026-09-03T13:46:00.000Z",
        kind: "human",
      },
    ],
  },
];
