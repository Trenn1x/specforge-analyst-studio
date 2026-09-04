"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EvidenceDrawer } from "@/components/evidence-drawer";
import { Icon } from "@/components/icons";
import { seedReleases } from "@/lib/demo-data";
import {
  assessRelease,
  buildReleaseReport,
  newestEvidenceFirst,
  refreshAutomatedAssessment,
  requestChanges,
  resolveApprovalBlocker,
  selectQualitySignals,
} from "@/lib/release-engine";
import { BrowserReleaseRepository } from "@/lib/release-repository";
import type { GateStatus, ReleaseAssessment, ReleaseCandidate } from "@/lib/types";

type GateFilter = "all" | GateStatus;

function formatTime(value: string) {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
}

function formatRelative(value: string, reference: string) {
  const date = new Date(value);
  const minutes = Math.round((new Date(reference).getTime() - date.getTime()) / 60_000);
  if (minutes <= 0) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

function verdictSummary(
  assessment: ReleaseAssessment,
  approvalNeedsReview: boolean,
  automatedGateNeedsWork: boolean,
) {
  if (assessment.blocked > 0) {
    const blocked = `${assessment.blocked} ${assessment.blocked === 1 ? "gate is" : "gates are"} blocking deployment.`;
    const pending = assessment.pending > 0
      ? ` ${assessment.pending} ${assessment.pending === 1 ? "gate is" : "gates are"} also pending.`
      : "";
    const nextStep = approvalNeedsReview && automatedGateNeedsWork
      ? " A human decision will be required after automated blockers are cleared."
      : approvalNeedsReview
        ? " A human decision is required to clear the remaining gate."
      : " Automated thresholds need work before deploy.";
    return `${blocked}${pending}${nextStep}`;
  }
  if (assessment.pending > 0) {
    return `${assessment.pending} ${assessment.pending === 1 ? "gate is" : "gates are"} awaiting review. ${approvalNeedsReview ? "Fresh evidence requires a human decision." : "The pending evidence must resolve before deploy."}`;
  }
  if (assessment.warnings > 0) {
    return `${assessment.warnings} non-blocking ${assessment.warnings === 1 ? "warning remains" : "warnings remain"}. Review is recommended before the deployment window.`;
  }
  return "All required gates are satisfied. The candidate can enter the protected deployment window.";
}

function statusLabel(status: GateStatus) {
  return status === "passed"
    ? "Passed"
    : status === "warning"
      ? "Warning"
      : status === "blocked"
        ? "Blocking"
        : "Pending";
}

export function ReleaseDashboard() {
  const [releases, setReleases] = useState<ReleaseCandidate[]>(seedReleases);
  const [selectedId, setSelectedId] = useState(seedReleases[0]?.id ?? "");
  const [gateFilter, setGateFilter] = useState<GateFilter>("all");
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [relativeTimeReference, setRelativeTimeReference] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const repositoryRef = useRef<BrowserReleaseRepository | null>(null);

  useEffect(() => {
    const repository = new BrowserReleaseRepository(window.localStorage);
    repositoryRef.current = repository;
    let hydrationFrame = 0;
    let cancelled = false;

    void repository.load().catch(() => null).then((storedReleases) => {
      if (cancelled) return;
      hydrationFrame = window.requestAnimationFrame(() => {
        if (storedReleases) setReleases(storedReleases);
        setRelativeTimeReference(new Date().toISOString());
        setHydrated(true);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(hydrationFrame);
      repositoryRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void repositoryRef.current?.save(releases).catch(() => undefined);
  }, [hydrated, releases]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const release = releases.find((candidate) => candidate.id === selectedId) ?? releases[0]!;
  const assessment = useMemo(() => assessRelease(release.gates), [release.gates]);
  const approvalGate = release.gates.find((gate) => gate.id === "approval");
  const approvalNeedsReview = approvalGate?.status === "blocked" || approvalGate?.status === "pending";
  const selectedGate = useMemo(() => {
    const gate = release.gates.find((candidate) => candidate.id === selectedGateId);
    return gate ? { ...gate, evidence: newestEvidenceFirst(gate.evidence) } : null;
  }, [release.gates, selectedGateId]);
  const filteredGates = release.gates.filter((gate) => gateFilter === "all" || gate.status === gateFilter);
  const qualitySignals = useMemo(() => selectQualitySignals(release), [release]);
  const qualityHeading = qualitySignals.some((signal) => signal.status === "blocked")
    ? "Thresholds need attention"
    : qualitySignals.some((signal) => signal.status === "warning" || signal.status === "pending")
      ? "Review quality signals"
      : "Inside the budget";
  const evidenceCount = release.gates.reduce((total, gate) => total + gate.evidence.length, 0);
  const evidenceCoverage = release.gates.length === 0
    ? 0
    : Math.round(
        (release.gates.filter((gate) => gate.evidence.length > 0).length / release.gates.length) * 100,
      );
  const scoreDelta = assessment.score - release.previousScore;
  const scoreDeltaLabel = `${scoreDelta > 0 ? "+" : ""}${scoreDelta} ${Math.abs(scoreDelta) === 1 ? "point" : "points"} vs. previous`;
  const openGateCount = assessment.blocked + assessment.pending;
  const automatedOpenGate = release.gates.find(
    (gate) => gate.automated && (gate.status === "blocked" || gate.status === "pending"),
  );
  const firstOpenGate = release.gates.find((gate) => gate.status === "blocked")
    ?? release.gates.find((gate) => gate.status === "pending");
  const verdictTone = assessment.blocked > 0
    ? "blocked"
    : assessment.pending > 0
      ? "pending"
      : assessment.verdict === "Ready"
        ? "passed"
        : "warning";
  const verdictKicker = assessment.blocked > 0
    ? "Blocking evidence needs attention"
    : assessment.pending > 0
      ? approvalNeedsReview ? "Decision required before deploy" : "Evidence pending before deploy"
      : assessment.verdict === "Ready"
        ? "Release criteria met"
        : "Review recommended before deploy";
  const verdictHeadline = assessment.verdict === "Ready"
    ? "Ready to ship"
    : assessment.verdict === "Hold"
      ? "Release on hold"
      : assessment.pending > 0 && assessment.blocked === 0
        ? approvalNeedsReview ? "Awaiting approval" : "Evidence pending"
        : "Conditional go";

  const updateCurrent = useCallback((update: (candidate: ReleaseCandidate) => ReleaseCandidate) => {
    setReleases((current) => current.map((candidate) => candidate.id === selectedId ? update(candidate) : candidate));
  }, [selectedId]);
  const closeEvidence = useCallback(() => setSelectedGateId(null), []);

  const runAssessment = async () => {
    if (isRunning) return;
    setIsRunning(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1050));
    const now = new Date().toISOString();
    const automatedGateCount = release.gates.filter((gate) => gate.automated).length;
    const invalidatedApprovals = release.gates.filter(
      (gate) => !gate.automated && gate.status === "passed",
    ).length;
    updateCurrent((candidate) => refreshAutomatedAssessment(candidate, now));
    setRelativeTimeReference(now);
    setIsRunning(false);
    setToast(
      invalidatedApprovals > 0
        ? `${automatedGateCount} synthetic receipts added · reapproval required`
        : `${automatedGateCount} synthetic receipts added · human decision unchanged`,
    );
  };

  const resolveBlocker = () => {
    const updated = resolveApprovalBlocker(release);
    const updatedAssessment = assessRelease(updated.gates);
    const remainingOpen = updatedAssessment.blocked + updatedAssessment.pending;
    setReleases((current) => current.map((candidate) => candidate.id === selectedId ? updated : candidate));
    setRelativeTimeReference(updated.lastAssessed);
    setToast(
      updatedAssessment.verdict === "Ready"
        ? "Human approval recorded · release is ready"
        : `Human approval recorded · ${remainingOpen} ${remainingOpen === 1 ? "gate remains" : "gates remain"} open`,
    );
  };

  const handleRequestChanges = () => {
    updateCurrent(requestChanges);
    setToast("Changes requested · release remains gated");
  };

  const resetDemo = () => {
    setReleases(seedReleases);
    setSelectedId(seedReleases[0]?.id ?? "");
    setSelectedGateId(null);
    setGateFilter("all");
    void repositoryRef.current?.clear().catch(() => undefined);
    setToast("Demo reset to the original release state");
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReleaseReport(release));
      setToast("Release report copied");
    } catch {
      setToast("Clipboard unavailable in this browser");
    }
  };

  const exportAssessment = () => {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      release,
      assessment,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${release.product.toLowerCase()}-${release.version}-assessment.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Assessment exported as JSON");
  };

  return (
    <div className="dashboard-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">RELEASE CONTROL / 03 SEP 2026</span>
          <h1>Operational release verdict</h1>
          <p>One accountable decision, backed by the evidence that produced it.</p>
        </div>
        <div className="heading-actions">
          <label className="release-select-label">
            <span>Release candidate</span>
            <select
              aria-label="Select release candidate"
              value={release.id}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setSelectedGateId(null);
                setGateFilter("all");
              }}
            >
              {releases.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>
                  {candidate.product} {candidate.version}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary compact" type="button" onClick={resetDemo}>
            <Icon name="refresh" size={15} />
            Reset demo
          </button>
        </div>
      </section>

      <section className="verdict-grid" aria-label="Release summary">
        <article className={`verdict-card ${assessment.verdict.toLowerCase()}`}>
          <div className="verdict-copy">
            <div className="verdict-kicker">
              <span className={`status-dot ${verdictTone}`} />
              {verdictKicker}
            </div>
            <h2>{verdictHeadline}</h2>
            <p>{verdictSummary(assessment, approvalNeedsReview, Boolean(automatedOpenGate))}</p>
            <div className="verdict-actions">
              <button className="button primary" type="button" onClick={runAssessment} disabled={isRunning}>
                <Icon name={isRunning ? "refresh" : "play"} size={16} className={isRunning ? "spin" : ""} />
                {isRunning ? "Refreshing demo evidence…" : "Re-run demo checks"}
              </button>
              {automatedOpenGate ? (
                <button className="button light" type="button" onClick={() => setSelectedGateId(automatedOpenGate.id)}>
                  Inspect automated {automatedOpenGate.status === "blocked" ? "blocker" : "pending gate"}
                </button>
              ) : approvalNeedsReview ? (
                <button className="button light" type="button" onClick={resolveBlocker}>
                  <Icon name="shield" size={16} />
                  {approvalGate?.status === "pending" ? "Record reapproval" : "Record demo approval"}
                </button>
              ) : assessment.warnings > 0 ? (
                <button className="button light" type="button" onClick={() => {
                  const warning = release.gates.find((gate) => gate.status === "warning");
                  setSelectedGateId(warning?.id ?? null);
                }}>
                  Review {assessment.warnings === 1 ? "warning" : "warnings"}
                </button>
              ) : (
                <button className="button light" type="button" onClick={handleRequestChanges}>
                  Request changes
                </button>
              )}
            </div>
          </div>

          <div className="score-wrap">
            <div
              className="score-ring"
              style={{ background: `conic-gradient(var(--verdict-accent) ${assessment.score}%, rgba(255,255,255,.14) 0)` }}
              aria-label={`Release readiness score ${assessment.score} out of 100`}
            >
              <div className="score-core">
                <strong>{assessment.score}</strong>
                <span>/ 100</span>
              </div>
            </div>
            <span className="score-caption">READINESS SCORE</span>
          </div>
        </article>

        <article className="summary-card attention">
          <div className="summary-card-head">
            <span>Open gates</span>
            <Icon name="shield" size={18} />
          </div>
          <strong>{openGateCount}</strong>
          <p>
            {assessment.blocked > 0 && assessment.pending > 0
              ? `${assessment.blocked} blocked · ${assessment.pending} pending`
              : assessment.blocked > 0
                ? `${assessment.blocked} ${assessment.blocked === 1 ? "gate" : "gates"} blocked`
                : assessment.pending > 0
                  ? `${assessment.pending} ${assessment.pending === 1 ? "gate" : "gates"} pending`
                  : "No blocked or pending gates"}
          </p>
          <button type="button" onClick={() => {
            setGateFilter(assessment.blocked > 0 ? "blocked" : "pending");
            setSelectedGateId(firstOpenGate?.id ?? null);
          }} disabled={openGateCount === 0}>
            View next open gate <Icon name="chevron-right" size={14} />
          </button>
        </article>

        <article className="summary-card">
          <div className="summary-card-head">
            <span>Change risk</span>
            <Icon name="git-branch" size={18} />
          </div>
          <strong className="word-value">{release.changeRisk}</strong>
          <p>{release.environment} · commit {release.commit}</p>
          <span className="trend-note">{scoreDeltaLabel}</span>
        </article>

        <article className="summary-card">
          <div className="summary-card-head">
            <span>Evidence coverage</span>
            <Icon name="file-check" size={18} />
          </div>
          <strong>{evidenceCoverage}%</strong>
          <p>{evidenceCount} {evidenceCount === 1 ? "artifact" : "artifacts"} linked</p>
          <div className="mini-progress"><span style={{ width: `${evidenceCoverage}%` }} /></div>
        </article>
      </section>

      <section className="panel proof-panel">
        <div className="panel-heading proof-heading">
          <div>
            <span className="eyebrow">PROOF STRIP</span>
            <h2>How this verdict was earned</h2>
          </div>
          <div className="gate-filters" aria-label="Filter release gates">
            {(["all", "passed", "warning", "blocked", "pending"] as GateFilter[]).map((filter) => (
              <button
                className={gateFilter === filter ? "filter-pill active" : "filter-pill"}
                type="button"
                aria-pressed={gateFilter === filter}
                key={filter}
                onClick={() => setGateFilter(filter)}
              >
                {filter === "all" ? "All gates" : statusLabel(filter)}
              </button>
            ))}
          </div>
        </div>

        <div className="proof-strip" aria-live="polite">
          {filteredGates.length > 0 ? filteredGates.map((gate, index) => {
            const latestEvidence = newestEvidenceFirst(gate.evidence)[0];
            const statusClass = gate.status === "pending" ? "pending warning" : gate.status;
            return (
              <button className={`proof-receipt ${statusClass}`} type="button" key={gate.id} onClick={() => setSelectedGateId(gate.id)}>
                <span className="receipt-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="receipt-icon">
                  <Icon name={gate.status === "passed" ? "check" : gate.status === "blocked" ? "x" : "activity"} size={14} />
                </span>
                <strong>{gate.shortLabel}</strong>
                <span className="receipt-result">{gate.result}</span>
                <span className="receipt-meta">{gate.evidence.length} evidence · {formatTime(latestEvidence?.timestamp ?? release.lastAssessed)}</span>
                <span className="receipt-open">Open proof <Icon name="chevron-right" size={13} /></span>
              </button>
            );
          }) : (
            <div className="empty-filter">No gates match this filter.</div>
          )}
        </div>
      </section>

      <section className="operations-grid">
        <article className="panel metrics-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">QUALITY SIGNALS</span>
              <h2>{qualityHeading}</h2>
            </div>
            <span className="mono subtle">commit {release.commit}</span>
          </div>
          <div className="metric-list">
            {qualitySignals.map((signal) => {
              const barColor = signal.status === "blocked"
                ? "var(--red)"
                : signal.status === "warning" || signal.status === "pending"
                  ? "var(--amber)"
                  : signal.id === "latency"
                    ? "var(--blue)"
                    : "var(--green)";
              return (
                <div className="metric-row" key={signal.id}>
                  <div>
                    <span>{signal.label}</span>
                    <small>{signal.target}</small>
                  </div>
                  <strong>{signal.value}</strong>
                  <div className="metric-bar">
                    <span style={{ width: `${signal.progress}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="quality-foot">
            <div>
              <Icon name="shield" size={17} />
              <span><strong>Rollback verified</strong><small>Estimated recovery 3m 12s</small></span>
            </div>
            <div>
              <Icon name="spark" size={17} />
              <span><strong>AI change declared</strong><small>Prompt bundle v14 reviewed</small></span>
            </div>
          </div>
        </article>

        <article className="panel release-queue-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ACTIVE QUEUE</span>
              <h2>Release candidates</h2>
            </div>
            <span className="count-badge">{releases.length}</span>
          </div>
          <div className="release-list">
            {releases.map((candidate) => {
              const candidateAssessment = assessRelease(candidate.gates);
              return (
                <button
                  type="button"
                  className={candidate.id === release.id ? "release-row selected" : "release-row"}
                  key={candidate.id}
                  onClick={() => {
                    setSelectedId(candidate.id);
                    setSelectedGateId(null);
                    setGateFilter("all");
                  }}
                >
                  <span className={`status-dot ${candidateAssessment.blocked > 0 ? "blocked" : candidateAssessment.pending > 0 ? "pending" : candidateAssessment.verdict === "Ready" ? "passed" : "warning"}`} />
                  <span className="release-name"><strong>{candidate.product} {candidate.version}</strong><small>{candidate.branch}</small></span>
                  <span className="release-score">{candidateAssessment.score}</span>
                  <Icon name="chevron-right" size={15} />
                </button>
              );
            })}
          </div>
        </article>

        <article className="panel audit-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">AUDIT TRAIL</span>
              <h2>Recent decisions</h2>
            </div>
            <span className="mono subtle">bounded demo log</span>
          </div>
          <div className="audit-list">
            {release.audit.slice(0, 5).map((event) => (
              <div className="audit-event" key={event.id}>
                <span className={`audit-mark ${event.kind}`}>
                  <Icon name={event.kind === "human" ? "users" : event.kind === "automation" ? "spark" : "terminal"} size={14} />
                </span>
                <div>
                  <strong>{event.action}</strong>
                  <p>{event.detail}</p>
                  <small>{event.actor} · {relativeTimeReference ? formatRelative(event.timestamp, relativeTimeReference) : formatTime(event.timestamp)}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="report-bar" aria-label="Assessment export actions">
        <div>
          <span className="eyebrow">SHARE THE DECISION</span>
          <p>Export the complete assessment or copy a compact release report.</p>
        </div>
        <div>
          <button className="button secondary" type="button" onClick={copyReport}>
            <Icon name="clipboard" size={16} /> Copy report
          </button>
          <button className="button dark" type="button" onClick={exportAssessment}>
            <Icon name="download" size={16} /> Export JSON
          </button>
        </div>
      </section>

      {toast ? <div className="toast" role="status"><Icon name="check" size={16} />{toast}</div> : null}
      <EvidenceDrawer gate={selectedGate} onClose={closeEvidence} />
    </div>
  );
}
