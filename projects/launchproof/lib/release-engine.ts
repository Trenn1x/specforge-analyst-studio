import type {
  EvidenceItem,
  GateStatus,
  ReleaseAssessment,
  ReleaseCandidate,
  ReleaseGate,
  ReleaseVerdict,
} from "@/lib/types";

const STATUS_MULTIPLIER: Record<GateStatus, number> = {
  passed: 1,
  warning: 0.68,
  blocked: 0.2,
  pending: 0.4,
};

export interface QualitySignal {
  id: "coverage" | "latency" | "ai-eval";
  label: string;
  target: string;
  value: string;
  progress: number;
  status: GateStatus;
}

export function calculateReleaseScore(gates: ReleaseGate[]): number {
  const totalWeight = gates.reduce((sum, gate) => sum + gate.weight, 0);
  if (totalWeight === 0) return 0;

  const earned = gates.reduce(
    (sum, gate) => sum + gate.weight * STATUS_MULTIPLIER[gate.status],
    0,
  );

  return Math.round((earned / totalWeight) * 100);
}

export function getVerdict(gates: ReleaseGate[], score: number): ReleaseVerdict {
  const hasBlocker = gates.some((gate) => gate.status === "blocked");
  const hasPending = gates.some((gate) => gate.status === "pending");

  if (hasBlocker && score < 78) return "Hold";
  if (hasBlocker || hasPending || score < 92) return "Conditional";
  return "Ready";
}

export function assessRelease(gates: ReleaseGate[]): ReleaseAssessment {
  const score = calculateReleaseScore(gates);

  return {
    score,
    verdict: getVerdict(gates, score),
    blocked: gates.filter((gate) => gate.status === "blocked").length,
    pending: gates.filter((gate) => gate.status === "pending").length,
    warnings: gates.filter((gate) => gate.status === "warning").length,
    passed: gates.filter((gate) => gate.status === "passed").length,
  };
}

export function newestEvidenceFirst(evidence: readonly EvidenceItem[]): EvidenceItem[] {
  return evidence
    .map((item, index) => ({ item, index, time: Date.parse(item.timestamp) }))
    .sort((left, right) => {
      const leftTime = Number.isNaN(left.time) ? Number.NEGATIVE_INFINITY : left.time;
      const rightTime = Number.isNaN(right.time) ? Number.NEGATIVE_INFINITY : right.time;
      return rightTime - leftTime || left.index - right.index;
    })
    .map(({ item }) => item);
}

export function newestEvidence(gate: ReleaseGate): EvidenceItem | undefined {
  return newestEvidenceFirst(gate.evidence)[0];
}

/**
 * Replays the automated portion of the browser demo without impersonating a
 * production runner. Each automated gate receives a new, clearly labelled
 * synthetic receipt. A prior human approval becomes pending because it did not
 * review the new evidence, while its historical evidence remains intact.
 */
export function refreshAutomatedAssessment(
  release: ReleaseCandidate,
  timestamp = new Date().toISOString(),
): ReleaseCandidate {
  const automatedGates = release.gates.filter((gate) => gate.automated);
  const approvedHumanGates = release.gates.filter(
    (gate) => !gate.automated && gate.status === "passed",
  );
  const receiptId = timestamp.replace(/[^0-9A-Za-z]/g, "");
  const gates = release.gates.map((gate) => {
    if (!gate.automated) {
      return gate.status === "passed"
        ? {
            ...gate,
            status: "pending" as const,
            result: "Reapproval required",
            summary: "Automated evidence changed after approval; a reviewer must approve the refreshed evidence.",
          }
        : gate;
    }

    return {
      ...gate,
      evidence: [
        {
          id: `demo-${gate.id}-${receiptId}`,
          label: `${gate.label} synthetic recheck`,
          actual: gate.result,
          threshold: newestEvidence(gate)?.threshold ?? "Configured release policy",
          source: "LaunchProof browser demo runner",
          sourceVersion: "browser-demo-v1",
          commit: release.commit,
          timestamp,
          whyItMatters: "A fresh, labelled receipt makes the simulated rerun auditable without presenting demo data as production telemetry.",
        },
        ...gate.evidence,
      ].slice(0, 50),
    };
  });

  return {
    ...release,
    previousScore: assessRelease(release.gates).score,
    lastAssessed: timestamp,
    gates,
    audit: [
      {
        id: `assessment-${receiptId}`,
        actor: "LaunchProof demo runner",
        action: "Re-ran automated demo checks",
        detail: approvedHumanGates.length > 0
          ? `Added synthetic evidence for ${automatedGates.length} automated gates and invalidated ${approvedHumanGates.length} prior human ${approvedHumanGates.length === 1 ? "approval" : "approvals"}; historical human evidence was retained.`
          : `Added synthetic evidence for ${automatedGates.length} automated gates; no approved human decision was changed.`,
        timestamp,
        kind: "automation" as const,
      },
      ...release.audit,
    ].slice(0, 500),
  };
}

export function selectQualitySignals(release: ReleaseCandidate): QualitySignal[] {
  const tests = release.gates.find((gate) => gate.id === "tests");
  const performance = release.gates.find((gate) => gate.id === "performance");
  const aiEvaluation = release.gates.find((gate) => gate.id === "ai-eval");
  const testEvidence = tests ? newestEvidenceFirst(tests.evidence) : [];
  const performanceEvidence = performance ? newestEvidenceFirst(performance.evidence) : [];
  const aiEvidence = aiEvaluation ? newestEvidenceFirst(aiEvaluation.evidence) : [];
  const coverage = testEvidence.find((item) => item.label.toLowerCase().includes("coverage"));
  const latency = performanceEvidence.find((item) => /latency/i.test(item.label));
  const aiQuality = aiEvidence.find((item) => /evaluation set|quality/i.test(item.label));

  return [
    buildQualitySignal({
      id: "coverage",
      label: coverage ? "Changed-line coverage" : "Automated test pass rate",
      gate: tests,
      actual: coverage?.actual ?? tests?.result ?? "Not measured",
      target: coverage?.threshold ?? (tests ? newestEvidence(tests)?.threshold : undefined) ?? "Configured test policy",
      mode: "percentage",
    }),
    buildQualitySignal({
      id: "latency",
      label: "API latency",
      gate: performance,
      actual: latency?.actual ?? performance?.result ?? "Not measured",
      target: latency?.threshold ?? (performance ? newestEvidence(performance)?.threshold : undefined) ?? "Configured latency budget",
      mode: "budget",
    }),
    buildQualitySignal({
      id: "ai-eval",
      label: "AI evaluation",
      gate: aiEvaluation,
      actual: aiQuality?.actual ?? aiEvaluation?.result ?? "Not measured",
      target: aiQuality?.threshold ?? (aiEvaluation ? newestEvidence(aiEvaluation)?.threshold : undefined) ?? "Configured AI policy",
      mode: "percentage",
    }),
  ];
}

interface QualitySignalInput {
  id: QualitySignal["id"];
  label: string;
  gate: ReleaseGate | undefined;
  actual: string;
  target: string;
  mode: "percentage" | "budget";
}

function buildQualitySignal(input: QualitySignalInput): QualitySignal {
  const status = input.gate?.status ?? "pending";
  const compactValue = input.mode === "budget"
    ? firstMatch(input.actual, /\d+(?:\.\d+)?\s*ms/i)
    : firstMatch(input.actual, /\d+(?:\.\d+)?%/);
  const value = compactValue ?? input.actual;
  const progress = input.mode === "budget"
    ? budgetConsumption(input.actual, input.target)
    : percentageFrom(value);

  return {
    id: input.id,
    label: input.label,
    target: input.target,
    value: status === "blocked" ? `${value} · blocked` : value,
    progress,
    status,
  };
}

function firstMatch(value: string, pattern: RegExp): string | null {
  return value.match(pattern)?.[0]?.replace(/\s+/g, "") ?? null;
}

function percentageFrom(value: string): number {
  const parsed = Number(value.match(/\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

function budgetConsumption(actual: string, target: string): number {
  const actualValue = Number(actual.match(/\d+(?:\.\d+)?/)?.[0]);
  const targetValue = Number(target.match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(actualValue) || !Number.isFinite(targetValue) || targetValue === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((actualValue / targetValue) * 100)));
}

export function resolveApprovalBlocker(release: ReleaseCandidate): ReleaseCandidate {
  const now = new Date().toISOString();
  const receiptId = now.replace(/[^0-9A-Za-z]/g, "");
  const gates = release.gates.map((gate) =>
    gate.id === "approval"
      ? {
          ...gate,
          status: "passed" as const,
          result: "Security approved",
          summary: "QA and security approvals are recorded.",
          evidence: [
            {
              id: `decision-${receiptId}`,
              label: "Human release decision",
              actual: "Approved by M. Chen",
              threshold: "Named, accountable reviewer decision",
              source: "LaunchProof browser demo",
              sourceVersion: "browser-demo-v1",
              commit: release.commit,
              timestamp: now,
              whyItMatters: "Automation informs the decision; an accountable person owns release approval.",
            },
            ...gate.evidence,
          ].slice(0, 50),
        }
      : gate,
  );

  return {
    ...release,
    lastAssessed: now,
    gates,
    audit: [
      {
        id: `event-${now}`,
        actor: "M. Chen",
        action: "Approved security gate",
        detail: "Threat-model delta reviewed; no release-blocking findings.",
        timestamp: now,
        kind: "human",
      },
      ...release.audit,
    ],
  };
}

export function requestChanges(release: ReleaseCandidate): ReleaseCandidate {
  const now = new Date().toISOString();
  return {
    ...release,
    lastAssessed: now,
    gates: release.gates.map((gate) =>
      gate.id === "approval"
        ? {
            ...gate,
            status: "blocked" as const,
            result: "Changes requested",
            summary: "A reviewer returned the release for another pass.",
          }
        : gate,
    ),
    audit: [
      {
        id: `event-${now}`,
        actor: "You",
        action: "Requested changes",
        detail: "Release remains blocked until the review note is resolved.",
        timestamp: now,
        kind: "human",
      },
      ...release.audit,
    ],
  };
}

export function buildReleaseReport(release: ReleaseCandidate): string {
  const assessment = assessRelease(release.gates);
  const gateLines = release.gates
    .map((gate) => `- ${gate.label}: ${gate.status.toUpperCase()} — ${gate.result}`)
    .join("\n");

  return [
    `${release.product} ${release.version} — ${assessment.verdict} (${assessment.score}/100)`,
    `Commit ${release.commit} · ${release.environment} · owner ${release.owner}`,
    `${assessment.blocked} blockers · ${assessment.pending} pending · ${assessment.warnings} warnings`,
    "",
    gateLines,
  ].join("\n");
}
