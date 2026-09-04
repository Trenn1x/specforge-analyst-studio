# AI assurance policy

## Position

AI is leverage, not authority. It can shorten feedback loops, generate alternatives, and expand test coverage. It cannot own architecture, accept risk, approve deployment, or validate its own output.

**Acceptance rule:** if the author cannot explain it, test it, and support it, it does not merge.

## Responsibility matrix

| Work | AI may assist | Human remains responsible |
| --- | --- | --- |
| Problem shaping | Summarize constraints; surface questions | User outcome, scope, and acceptance criteria |
| Architecture | Generate alternatives; challenge assumptions | Trust boundaries, tradeoffs, and final decision |
| Implementation | Scaffold repetitive code; suggest focused changes | Correctness, readability, integration, and maintenance |
| Testing | Propose edge cases and adversarial fixtures | Test oracle, meaningful coverage, and interpretation |
| Security | Brainstorm abuse cases; review common weaknesses | Threat model, data handling, remediation, and sign-off |
| Documentation | Draft structure and change summaries | Accuracy, deployment truth, and operational usefulness |
| Release | Summarize evidence | Risk acceptance and final approval |

## Required workflow

1. **Constrain:** provide the smallest necessary context and explicit acceptance criteria. Never provide secrets, personal data, customer data, or proprietary material to an unapproved AI service.
2. **Generate:** ask for bounded output or competing approaches rather than an opaque end-to-end answer.
3. **Inspect:** read the full change, trace data and failure paths, and identify unsupported assumptions.
4. **Prove:** run deterministic tests, type checks, linting, builds, security checks, and relevant manual scenarios.
5. **Challenge:** add negative and adversarial cases, especially around authorization, injection, stale data, retries, and destructive actions.
6. **Disclose:** record material AI assistance and the validation performed in the pull request.
7. **Review:** a human reviewer evaluates the resulting change under the same standard as human-written code.

AI-generated tests are not independent proof if the same prompt or model generated the implementation and the oracle. At least one meaningful acceptance assertion must come from the stated product contract or a separately reasoned invariant.

## Seeded AI-evaluation evidence

The public demonstration includes a **seeded** AI-evaluation gate to show how model-backed product evidence can participate in a broader release decision. LaunchProof does not call a model, run an evaluator, or validate model output in this release. The deterministic policy only consumes the normalized gate status supplied by seed data or an API caller.

A future evaluation integration should record:

- model and prompt/configuration version;
- versioned evaluation set;
- quality and refusal thresholds;
- injection and data-exfiltration cases;
- raw outcome location and aggregate result;
- evaluator version, known limitations, and timestamp.

That future boundary should convert results into a normalized gate update before deterministic policy runs. Free-form commentary should remain advisory and must not create a human approval.

## Requirements for a future evaluator integration

- External evaluator unavailable or timed out: mark AI evidence `pending`; continue non-AI checks.
- Invalid or nonconforming output: reject it at a runtime schema boundary and retain a safe error category.
- Evaluation regression: block or warn according to a versioned threshold; do not silently change the baseline.
- Suspected prompt injection: isolate the input, preserve a redacted trace, and prevent tool/action execution.
- Unexplainable generated change: revert or rewrite it before review.

## Pull-request disclosure

Use a short statement such as:

> AI assisted with test-case expansion and documentation structure. I reviewed the full diff, derived assertions from the acceptance criteria, and ran the listed quality gates. No secrets or customer data were provided.

The point is provenance and review clarity, not performative accounting of every autocomplete.
