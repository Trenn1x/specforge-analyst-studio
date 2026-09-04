import type {
  AuditEvent,
  EvidenceItem,
  GateStatus,
  ReleaseAssessment,
  ReleaseCandidate,
  ReleaseGate,
} from "@/lib/types";

export const DEFAULT_RELEASE_STORAGE_KEY = "launchproof-releases-v2";

export interface ReleaseDataSource {
  load(): Promise<ReleaseCandidate[] | null>;
}

export interface ReleaseRepository extends ReleaseDataSource {
  save(releases: readonly ReleaseCandidate[]): Promise<void>;
  clear(): Promise<void>;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Static Pages uses this repository. The storage object is injected so the
 * persistence boundary remains testable and does not reach for `window` from
 * shared code.
 */
export class BrowserReleaseRepository implements ReleaseRepository {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = DEFAULT_RELEASE_STORAGE_KEY,
  ) {}

  async load(): Promise<ReleaseCandidate[] | null> {
    const stored = this.storage.getItem(this.storageKey);
    if (!stored) return null;

    try {
      const parsed: unknown = JSON.parse(stored);
      if (!isReleaseCandidateList(parsed)) throw new Error("Invalid release cache");
      return parsed;
    } catch {
      this.storage.removeItem(this.storageKey);
      return null;
    }
  }

  async save(releases: readonly ReleaseCandidate[]): Promise<void> {
    this.storage.setItem(this.storageKey, JSON.stringify(releases));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.storageKey);
  }
}

export interface FastApiEvidenceItemDto {
  id: string;
  label: string;
  actual: string;
  threshold: string;
  source: string;
  source_version: string;
  commit: string;
  observed_at: string;
  why_it_matters: string;
}

export interface FastApiReleaseGateDto {
  id: string;
  label: string;
  status: GateStatus;
  result: string;
  summary: string;
  weight: number;
  automated: boolean;
  evidence: FastApiEvidenceItemDto[];
}

export interface FastApiAuditEventDto {
  id: string;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
  kind: AuditEvent["kind"];
}

export interface FastApiReleaseCandidateDto {
  id: string;
  product: string;
  version: string;
  commit: string;
  branch: string;
  environment: string;
  owner: string;
  change_risk: ReleaseCandidate["changeRisk"];
  previous_score: number;
  last_assessed: string;
  gates: FastApiReleaseGateDto[];
  audit: FastApiAuditEventDto[];
}

export interface FastApiReleaseSummaryDto {
  id: string;
  product: string;
  version: string;
  environment: string;
  owner: string;
  change_risk: ReleaseCandidate["changeRisk"];
  last_assessed: string;
  assessment: ReleaseAssessment & { pending: number };
}

export interface FastApiReleaseListResponseDto {
  items: FastApiReleaseSummaryDto[];
  count: number;
}

export interface FastApiReleaseDetailResponseDto {
  release: FastApiReleaseCandidateDto;
  assessment: ReleaseAssessment & { pending: number };
}

export interface FastApiGateUpdateDto {
  gate_id: string;
  status: GateStatus;
  result: string;
  summary?: string;
  evidence: FastApiEvidenceReceiptDto;
}

export interface FastApiEvidenceReceiptDto {
  observed_at: string;
  actual: string;
  threshold: string;
  source_version: string;
  label: string;
  why_it_matters: string;
}

export interface FastApiAssessmentRequestDto {
  expected_commit: string;
  actor: string;
  source: string;
  gate_updates: FastApiGateUpdateDto[];
}

export interface FastApiAssessmentResponseDto {
  release: FastApiReleaseCandidateDto;
  assessment: ReleaseAssessment & { pending: number };
  event: FastApiAuditEventDto;
}

export interface AutomatedAssessmentCommand {
  expectedCommit: string;
  actor: string;
  source: string;
  gateUpdates: Array<{
    gateId: string;
    status: GateStatus;
    result: string;
    summary?: string;
    evidence: {
      observedAt: string;
      actual: string;
      threshold: string;
      sourceVersion: string;
      label: string;
      whyItMatters: string;
    };
  }>;
}

const SHORT_GATE_LABELS: Record<string, string> = {
  accessibility: "A11y",
  approval: "Approval",
  "ai-eval": "AI eval",
  build: "Build",
  performance: "Perf",
  security: "Security",
  tests: "Tests",
};

export function mapFastApiReleaseCandidate(dto: FastApiReleaseCandidateDto): ReleaseCandidate {
  return {
    id: dto.id,
    product: dto.product,
    version: dto.version,
    commit: dto.commit,
    branch: dto.branch,
    environment: dto.environment,
    owner: dto.owner,
    changeRisk: dto.change_risk,
    previousScore: dto.previous_score,
    lastAssessed: dto.last_assessed,
    gates: dto.gates.map(mapFastApiReleaseGate),
    audit: dto.audit.map((event) => ({ ...event })),
  };
}

export function mapAutomatedAssessmentCommand(
  command: AutomatedAssessmentCommand,
): FastApiAssessmentRequestDto {
  return {
    expected_commit: command.expectedCommit,
    actor: command.actor,
    source: command.source,
    gate_updates: command.gateUpdates.map((gate) => ({
      gate_id: gate.gateId,
      status: gate.status,
      result: gate.result,
      ...(gate.summary ? { summary: gate.summary } : {}),
      evidence: {
        observed_at: gate.evidence.observedAt,
        actual: gate.evidence.actual,
        threshold: gate.evidence.threshold,
        source_version: gate.evidence.sourceVersion,
        label: gate.evidence.label,
        why_it_matters: gate.evidence.whyItMatters,
      },
    })),
  };
}

function mapFastApiReleaseGate(dto: FastApiReleaseGateDto): ReleaseGate {
  return {
    id: dto.id,
    label: dto.label,
    shortLabel: SHORT_GATE_LABELS[dto.id] ?? dto.label,
    status: dto.status,
    result: dto.result,
    summary: dto.summary,
    weight: dto.weight,
    automated: dto.automated,
    evidence: dto.evidence.map((item) => ({
      id: item.id,
      label: item.label,
      actual: item.actual,
      threshold: item.threshold,
      source: item.source,
      sourceVersion: item.source_version,
      commit: item.commit,
      timestamp: item.observed_at,
      whyItMatters: item.why_it_matters,
    })),
  };
}

export class FastApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "FastApiClientError";
  }
}

const FALLBACK_API_ERROR_CODE = "api_request_failed";
const MAX_API_ERROR_MESSAGE_LENGTH = 300;
const API_ERROR_CODE_PATTERN = /^[a-z][a-z0-9_]{0,79}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

interface ParsedFastApiError {
  code: string | null;
  message: string | null;
  requestId: string | null;
}

async function parseFastApiError(response: Response): Promise<ParsedFastApiError> {
  try {
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isRecord(payload.error)) {
      return { code: null, message: null, requestId: null };
    }

    const code = typeof payload.error.code === "string"
      && API_ERROR_CODE_PATTERN.test(payload.error.code)
      ? payload.error.code
      : null;
    const message = toSafeApiErrorMessage(payload.error.message);
    const requestId = toSafeRequestId(payload.request_id);

    return { code, message, requestId };
  } catch {
    return { code: null, message: null, requestId: null };
  }
}

function toSafeApiErrorMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_API_ERROR_MESSAGE_LENGTH);
}

function toSafeRequestId(value: unknown): string | null {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value) ? value : null;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Production-shaped client for the included FastAPI service. GitHub Pages does
 * not instantiate this class; enabling it is an explicit deployment decision.
 */
export class FastApiReleaseClient implements ReleaseDataSource {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly fetcher: Fetcher = fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async load(): Promise<ReleaseCandidate[]> {
    const list = await this.request<FastApiReleaseListResponseDto>("/v1/releases");
    return Promise.all(list.items.map((item) => this.getRelease(item.id)));
  }

  async getRelease(releaseId: string): Promise<ReleaseCandidate> {
    const response = await this.request<FastApiReleaseDetailResponseDto>(
      `/v1/releases/${encodeURIComponent(releaseId)}`,
    );
    return mapFastApiReleaseCandidate(response.release);
  }

  async recordAssessment(
    releaseId: string,
    command: AutomatedAssessmentCommand,
    idempotencyKey: string,
  ): Promise<ReleaseCandidate> {
    const response = await this.request<FastApiAssessmentResponseDto>(
      `/v1/releases/${encodeURIComponent(releaseId)}/assessments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(mapAutomatedAssessmentCommand(command)),
      },
    );
    return mapFastApiReleaseCandidate(response.release);
  }

  private async request<ResponseDto>(path: string, init?: RequestInit): Promise<ResponseDto> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const parsedError = await parseFastApiError(response);
      const requestId = toSafeRequestId(response.headers.get("X-Request-ID"))
        ?? parsedError.requestId;
      throw new FastApiClientError(
        parsedError.message ?? `LaunchProof API request failed with ${response.status}.`,
        response.status,
        parsedError.code ?? FALLBACK_API_ERROR_CODE,
        requestId,
      );
    }
    return response.json() as Promise<ResponseDto>;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isEvidenceItem(value: unknown): value is EvidenceItem {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.actual)
    && isNonEmptyString(value.threshold)
    && isNonEmptyString(value.source)
    && (value.sourceVersion === undefined || isNonEmptyString(value.sourceVersion))
    && (value.commit === undefined || isNonEmptyString(value.commit))
    && isTimestamp(value.timestamp)
    && isNonEmptyString(value.whyItMatters);
}

function isGateStatus(value: unknown): value is GateStatus {
  return value === "passed" || value === "warning" || value === "blocked" || value === "pending";
}

function isReleaseGate(value: unknown): value is ReleaseGate {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.label)
    && isNonEmptyString(value.shortLabel)
    && isGateStatus(value.status)
    && isNonEmptyString(value.result)
    && isNonEmptyString(value.summary)
    && typeof value.weight === "number"
    && Number.isFinite(value.weight)
    && typeof value.automated === "boolean"
    && Array.isArray(value.evidence)
    && value.evidence.every(isEvidenceItem);
}

function isAuditEvent(value: unknown): value is AuditEvent {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.actor)
    && isNonEmptyString(value.action)
    && isNonEmptyString(value.detail)
    && isTimestamp(value.timestamp)
    && (value.kind === "automation" || value.kind === "human" || value.kind === "system");
}

function isReleaseCandidate(value: unknown): value is ReleaseCandidate {
  if (!isRecord(value)) return false;
  const validRisk = value.changeRisk === "Low" || value.changeRisk === "Medium" || value.changeRisk === "High";
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.product)
    && isNonEmptyString(value.version)
    && isNonEmptyString(value.commit)
    && isNonEmptyString(value.branch)
    && isNonEmptyString(value.environment)
    && isNonEmptyString(value.owner)
    && validRisk
    && typeof value.previousScore === "number"
    && Number.isFinite(value.previousScore)
    && isTimestamp(value.lastAssessed)
    && Array.isArray(value.gates)
    && value.gates.length > 0
    && value.gates.every(isReleaseGate)
    && Array.isArray(value.audit)
    && value.audit.every(isAuditEvent);
}

function isReleaseCandidateList(value: unknown): value is ReleaseCandidate[] {
  return Array.isArray(value) && value.length > 0 && value.every(isReleaseCandidate);
}
