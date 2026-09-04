import { describe, expect, it, vi } from "vitest";

import { seedReleases } from "./demo-data";
import {
  BrowserReleaseRepository,
  DEFAULT_RELEASE_STORAGE_KEY,
  FastApiClientError,
  FastApiReleaseClient,
  mapAutomatedAssessmentCommand,
  mapFastApiReleaseCandidate,
} from "./release-repository";
import type {
  FastApiReleaseCandidateDto,
  FastApiReleaseListResponseDto,
} from "./release-repository";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const apiRelease: FastApiReleaseCandidateDto = {
  id: "atlas-270",
  product: "Atlas",
  version: "v2.7.0",
  commit: "8f3c9bd",
  branch: "release/2.7.0",
  environment: "staging",
  owner: "Nora Shah",
  change_risk: "Medium",
  previous_score: 91,
  last_assessed: "2026-09-04T12:00:00Z",
  gates: [
    {
      id: "ai-eval",
      label: "AI evaluation",
      status: "passed",
      result: "93% · 120 cases",
      summary: "The evaluation policy passed.",
      weight: 18,
      automated: true,
      evidence: [
        {
          id: "ev-1",
          label: "Evaluation set",
          actual: "112 of 120 accepted (93%)",
          threshold: "At least 90%",
          source: "evaluation-runner",
          source_version: "evals-v4",
          commit: "8f3c9bd",
          observed_at: "2026-09-04T11:59:00Z",
          why_it_matters: "A versioned evaluation makes quality inspectable.",
        },
      ],
    },
  ],
  audit: [
    {
      id: "evt-1",
      actor: "LaunchProof",
      action: "Recorded assessment",
      detail: "AI evidence recorded.",
      timestamp: "2026-09-04T12:00:00Z",
      kind: "automation",
    },
  ],
};

describe("release repositories", () => {
  it("round-trips validated releases through browser storage", async () => {
    const storage = new MemoryStorage();
    const repository = new BrowserReleaseRepository(storage);

    await repository.save(seedReleases);
    const loaded = await repository.load();

    expect(loaded).toEqual(seedReleases);
    expect(loaded).not.toBe(seedReleases);
    await repository.clear();
    expect(await repository.load()).toBeNull();
  });

  it("discards a malformed browser cache", async () => {
    const storage = new MemoryStorage();
    storage.setItem(DEFAULT_RELEASE_STORAGE_KEY, JSON.stringify([{ id: "incomplete" }]));
    const repository = new BrowserReleaseRepository(storage);

    expect(await repository.load()).toBeNull();
    expect(storage.getItem(DEFAULT_RELEASE_STORAGE_KEY)).toBeNull();
  });

  it("maps the FastAPI snake_case contract without losing provenance", () => {
    const release = mapFastApiReleaseCandidate(apiRelease);

    expect(release).toMatchObject({
      changeRisk: "Medium",
      previousScore: 91,
      lastAssessed: "2026-09-04T12:00:00Z",
    });
    expect(release.gates[0]).toMatchObject({ shortLabel: "AI eval" });
    expect(release.gates[0]?.evidence[0]).toMatchObject({
      timestamp: "2026-09-04T11:59:00Z",
      sourceVersion: "evals-v4",
      commit: "8f3c9bd",
      whyItMatters: "A versioned evaluation makes quality inspectable.",
    });
  });

  it("maps a camelCase assessment command to the FastAPI mutation DTO", () => {
    expect(mapAutomatedAssessmentCommand({
      expectedCommit: "8f3c9bd",
      actor: "CI runner",
      source: "GitHub Actions",
      gateUpdates: [
        {
          gateId: "tests",
          status: "passed",
          result: "430 / 430",
          evidence: {
            observedAt: "2026-09-04T12:05:00Z",
            actual: "430 passed",
            threshold: "100% pass",
            sourceVersion: "run-2041",
            label: "Test suite",
            whyItMatters: "Tests provide regression evidence.",
          },
        },
      ],
    })).toEqual({
      expected_commit: "8f3c9bd",
      actor: "CI runner",
      source: "GitHub Actions",
      gate_updates: [
        {
          gate_id: "tests",
          status: "passed",
          result: "430 / 430",
          evidence: {
            observed_at: "2026-09-04T12:05:00Z",
            actual: "430 passed",
            threshold: "100% pass",
            source_version: "run-2041",
            label: "Test suite",
            why_it_matters: "Tests provide regression evidence.",
          },
        },
      ],
    });
  });

  it("loads full releases through the explicit FastAPI client", async () => {
    const list: FastApiReleaseListResponseDto = {
      items: [
        {
          id: apiRelease.id,
          product: apiRelease.product,
          version: apiRelease.version,
          environment: apiRelease.environment,
          owner: apiRelease.owner,
          change_risk: apiRelease.change_risk,
          last_assessed: apiRelease.last_assessed,
          assessment: {
            score: 100,
            verdict: "Ready",
            blocked: 0,
            warnings: 0,
            passed: 1,
            pending: 0,
          },
        },
      ],
      count: 1,
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.endsWith("/v1/releases")
        ? list
        : { release: apiRelease, assessment: list.items[0]!.assessment };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const client = new FastApiReleaseClient("https://api.example.test/", fetcher);

    const releases = await client.load();

    expect(releases).toHaveLength(1);
    expect(releases[0]?.id).toBe("atlas-270");
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/v1/releases",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/v1/releases/atlas-270",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("preserves structured FastAPI error details and the response request id", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: "commit_conflict",
        message: "The release commit changed; refresh before recording evidence.",
        issues: null,
      },
      request_id: "body-request-456",
    }), {
      status: 409,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "header-request-123",
      },
    }));
    const client = new FastApiReleaseClient("https://api.example.test", fetcher);

    const error = await client.getRelease("atlas-270").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FastApiClientError);
    expect(error).toMatchObject({
      name: "FastApiClientError",
      message: "The release commit changed; refresh before recording evidence.",
      status: 409,
      code: "commit_conflict",
      requestId: "header-request-123",
    });
  });

  it.each([
    {
      name: "malformed JSON",
      body: "{not-json",
      contentType: "application/json",
    },
    {
      name: "a non-JSON response",
      body: "<h1>upstream proxy failure</h1>",
      contentType: "text/html",
    },
  ])("falls back safely for $name", async ({ body, contentType }) => {
    const fetcher = vi.fn(async () => new Response(body, {
      status: 502,
      headers: {
        "Content-Type": contentType,
        "X-Request-ID": "gateway-request-789",
      },
    }));
    const client = new FastApiReleaseClient("https://api.example.test", fetcher);

    const error = await client.getRelease("atlas-270").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FastApiClientError);
    expect(error).toMatchObject({
      message: "LaunchProof API request failed with 502.",
      status: 502,
      code: "api_request_failed",
      requestId: "gateway-request-789",
    });
    expect((error as Error).message).not.toContain(body);
  });

  it("sanitizes a structured message and falls back to the body request id", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: "validation_error",
        message: "  The request\u0000 did not match\n the API contract.  ",
      },
      request_id: "body-request-456",
    }), {
      status: 422,
      headers: { "Content-Type": "application/problem+json" },
    }));
    const client = new FastApiReleaseClient("https://api.example.test", fetcher);

    const error = await client.getRelease("atlas-270").catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      message: "The request did not match the API contract.",
      status: 422,
      code: "validation_error",
      requestId: "body-request-456",
    });
  });
});
