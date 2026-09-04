export type GateStatus = "passed" | "warning" | "blocked" | "pending";

export type ReleaseVerdict = "Ready" | "Conditional" | "Hold";

export interface EvidenceItem {
  id: string;
  label: string;
  actual: string;
  threshold: string;
  source: string;
  sourceVersion?: string;
  commit?: string;
  timestamp: string;
  whyItMatters: string;
}

export interface ReleaseGate {
  id: string;
  label: string;
  shortLabel: string;
  status: GateStatus;
  result: string;
  summary: string;
  weight: number;
  automated: boolean;
  evidence: EvidenceItem[];
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
  kind: "automation" | "human" | "system";
}

export interface ReleaseCandidate {
  id: string;
  product: string;
  version: string;
  commit: string;
  branch: string;
  environment: string;
  owner: string;
  changeRisk: "Low" | "Medium" | "High";
  previousScore: number;
  lastAssessed: string;
  gates: ReleaseGate[];
  audit: AuditEvent[];
}

export interface ReleaseAssessment {
  score: number;
  verdict: ReleaseVerdict;
  blocked: number;
  pending: number;
  warnings: number;
  passed: number;
}
