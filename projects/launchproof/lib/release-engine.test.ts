import { describe, expect, it } from "vitest";

import {
  assessRelease,
  buildReleaseReport,
  newestEvidenceFirst,
  refreshAutomatedAssessment,
  resolveApprovalBlocker,
  selectQualitySignals,
} from "./release-engine";
import { seedReleases } from "./demo-data";

describe("release engine", () => {
  it("keeps an unapproved candidate conditional", () => {
    const release = seedReleases[0];
    expect(release).toBeDefined();
    const assessment = assessRelease(release!.gates);

    expect(assessment.verdict).toBe("Conditional");
    expect(assessment.blocked).toBe(1);
    expect(assessment.score).toBeGreaterThanOrEqual(80);
  });

  it("moves the candidate to ready only after human approval", () => {
    const release = seedReleases[0];
    expect(release).toBeDefined();
    const resolved = resolveApprovalBlocker(release!);
    const assessment = assessRelease(resolved.gates);

    expect(assessment.verdict).toBe("Ready");
    expect(assessment.blocked).toBe(0);
    expect(assessment.pending).toBe(0);
    expect(resolved.audit[0]?.kind).toBe("human");
  });

  it("does not hide failed automated gates behind a human approval", () => {
    const release = seedReleases[2];
    expect(release).toBeDefined();
    const resolved = resolveApprovalBlocker(release!);
    const assessment = assessRelease(resolved.gates);

    expect(assessment.verdict).toBe("Hold");
    expect(assessment.blocked).toBe(2);
  });

  it("produces a compact, auditable release report", () => {
    const release = seedReleases[0];
    expect(release).toBeDefined();
    const report = buildReleaseReport(release!);

    expect(report).toContain("Atlas v2.7.0");
    expect(report).toContain("Human approval: BLOCKED");
    expect(report).toContain("Commit 8f3c9bd");
  });

  it("scores an empty gate set safely", () => {
    expect(assessRelease([])).toEqual({
      score: 0,
      verdict: "Conditional",
      blocked: 0,
      pending: 0,
      warnings: 0,
      passed: 0,
    });
  });

  it("adds fresh synthetic receipts only to automated gates", () => {
    const release = seedReleases[0]!;
    const timestamp = "2026-09-04T12:34:56.000Z";
    const approvalBefore = release.gates.find((gate) => gate.id === "approval")!;
    const updated = refreshAutomatedAssessment(release, timestamp);

    expect(updated.lastAssessed).toBe(timestamp);
    for (const gate of updated.gates.filter((item) => item.automated)) {
      const original = release.gates.find((item) => item.id === gate.id)!;
      expect(gate.evidence).toHaveLength(original.evidence.length + 1);
      expect(gate.evidence[0]).toMatchObject({
        source: "LaunchProof browser demo runner",
        sourceVersion: "browser-demo-v1",
        commit: release.commit,
        timestamp,
      });
    }

    const approvalAfter = updated.gates.find((gate) => gate.id === "approval")!;
    expect(approvalAfter).toBe(approvalBefore);
    expect(approvalAfter.evidence).toBe(approvalBefore.evidence);
    expect(updated.audit[0]?.detail).toContain("no approved human decision was changed");
  });

  it("requires reapproval after automated evidence changes", () => {
    const release = seedReleases.find((candidate) => candidate.id === "nimbus-194")!;
    const timestamp = "2026-09-04T12:34:56.000Z";
    const approvalBefore = release.gates.find((gate) => gate.id === "approval")!;
    const updated = refreshAutomatedAssessment(release, timestamp);
    const approvalAfter = updated.gates.find((gate) => gate.id === "approval")!;
    const assessment = assessRelease(updated.gates);

    expect(approvalBefore.status).toBe("passed");
    expect(approvalAfter).toMatchObject({
      status: "pending",
      result: "Reapproval required",
    });
    expect(approvalAfter.evidence).toBe(approvalBefore.evidence);
    expect(assessment).toMatchObject({
      verdict: "Conditional",
      blocked: 0,
      pending: 1,
    });
    expect(updated.audit[0]?.detail).toContain("invalidated 1 prior human approval");
    expect(updated.audit[0]?.detail).toContain("historical human evidence was retained");
  });

  it("orders API-appended evidence newest first", () => {
    const gate = seedReleases[0]!.gates.find((candidate) => candidate.id === "build")!;
    const appendedReceipt = {
      ...gate.evidence[0]!,
      id: "api-appended",
      timestamp: "2026-09-04T13:00:00.000Z",
    };

    const ordered = newestEvidenceFirst([...gate.evidence, appendedReceipt]);

    expect(ordered[0]?.id).toBe("api-appended");
    expect(ordered.at(-1)?.timestamp).toBe("2026-09-03T18:42:00.000Z");
  });

  it("derives quality signals from the selected release", () => {
    const relay = seedReleases.find((release) => release.id === "relay-420")!;
    const signals = selectQualitySignals(relay);

    expect(signals.find((signal) => signal.id === "coverage")).toMatchObject({
      value: "84% · blocked",
      status: "blocked",
    });
    expect(signals.find((signal) => signal.id === "ai-eval")).toMatchObject({
      value: "82% · blocked",
      progress: 82,
      status: "blocked",
    });
    expect(signals.find((signal) => signal.id === "latency")?.value).toBe("184ms");
  });

  it("keeps Nimbus passed evidence consistent with its verdict", () => {
    const nimbus = seedReleases.find((release) => release.id === "nimbus-194")!;
    const tests = nimbus.gates.find((gate) => gate.id === "tests")!;
    const approval = nimbus.gates.find((gate) => gate.id === "approval")!;

    expect(assessRelease(nimbus.gates).verdict).toBe("Ready");
    expect(tests).toMatchObject({ status: "passed", result: "430 / 430" });
    expect(tests.evidence[0]?.actual).toContain("430 passed without retry");
    expect(approval).toMatchObject({
      status: "passed",
      result: "QA + security approved",
    });
    expect(approval.summary).not.toContain("pending");
    expect(approval.evidence[0]?.actual).toBe("Approved by QA and security");
  });
});
