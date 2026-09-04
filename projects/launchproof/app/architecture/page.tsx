import { Icon, type IconName } from "@/components/icons";

const capabilities: Array<{ icon: IconName; title: string; service: string; detail: string }> = [
  {
    icon: "terminal",
    title: "Runtime",
    service: "FastAPI reference",
    detail: "A tested container exposes health, release, assessment, decision, and audit endpoints with process-local state.",
  },
  {
    icon: "layers",
    title: "Current state",
    service: "In-memory repository",
    detail: "Thread-safe, bounded storage makes API behavior testable. A restart resets its data and idempotency history.",
  },
  {
    icon: "activity",
    title: "Durable path",
    service: "Firestore + Pub/Sub",
    detail: "Terraform reserves these GCP resources for future persistence and async ingestion; the current API does not use them.",
  },
  {
    icon: "spark",
    title: "Decision policy",
    service: "Deterministic + tested",
    detail: "Pure scoring converts normalized gate states into an explainable verdict without a model dependency.",
  },
  {
    icon: "shield",
    title: "Trust boundary",
    service: "Private Cloud Run + OIDC",
    detail: "The reference infrastructure keeps invocation private and gives GitHub short-lived deployment credentials.",
  },
  {
    icon: "git-branch",
    title: "Delivery",
    service: "GitHub Actions",
    detail: "Pull requests run quality gates; an environment-scoped manual workflow can update the Cloud Run image.",
  },
];

const decisions = [
  {
    id: "ADR-001",
    title: "Keep the public demo static",
    detail: "Pages instantiates BrowserReleaseRepository; the FastAPI client remains an explicit, unhosted option.",
  },
  {
    id: "ADR-002",
    title: "Require a human for deployment",
    detail: "Automation may recommend Ready, but it cannot grant the final protected-environment approval.",
  },
  {
    id: "ADR-003",
    title: "Separate evidence from verdicts",
    detail: "Gate observations remain distinct from the pure policy that calculates a release recommendation.",
  },
];

export default function ArchitecturePage() {
  return (
    <div className="content-page architecture-page">
      <section className="page-heading narrative-heading">
        <div>
          <span className="eyebrow">SYSTEM DESIGN / ADR-001—003</span>
          <h1>A deployable path, not a diagram-only promise.</h1>
          <p>The live demo is intentionally static. The API is tested and containerized; its durable cloud adapters remain future work.</p>
        </div>
        <a className="button dark" href="https://github.com/Trenn1x/specforge-analyst-studio/tree/main/projects/launchproof/infra/terraform" target="_blank" rel="noreferrer">
          View Terraform <Icon name="arrow-up-right" size={15} />
        </a>
      </section>

      <section className="architecture-hero panel">
        <div className="architecture-copy">
          <span className="eyebrow">REFERENCE TOPOLOGY</span>
          <h2>State boundaries made explicit.</h2>
          <p>
            A typed mapping boundary keeps the browser demo separate from the tested FastAPI reference. Terraform defines
            a least-privilege GCP path without pretending its planned data adapters already exist.
          </p>
          <div className="truth-note">
            <Icon name="shield" size={18} />
            <div>
              <strong>Deployment truth</strong>
              <span>Only GitHub Pages is live. The API runs in tests with memory-backed state; GCP resources are defined, not running.</span>
            </div>
          </div>
        </div>

        <div className="topology" aria-label="LaunchProof deployment architecture">
          <div className="topology-lane public-lane">
            <span>PUBLIC EDGE</span>
            <div className="topology-node primary-node">
              <Icon name="code" size={20} />
              <strong>Next.js client</strong>
              <small>GitHub Pages</small>
            </div>
          </div>
          <div className="topology-connector"><span>HTTPS / CI OIDC</span></div>
          <div className="topology-lane cloud-lane">
            <span>DEFINED GCP PATH</span>
            <div className="cloud-grid">
              <div className="topology-node"><Icon name="terminal" size={18} /><strong>Cloud Run</strong><small>One-instance cap</small></div>
              <div className="topology-node"><Icon name="layers" size={18} /><strong>Process memory</strong><small>Current API</small></div>
              <div className="topology-node"><Icon name="layers" size={18} /><strong>Firestore</strong><small>Future adapter</small></div>
              <div className="topology-node"><Icon name="activity" size={18} /><strong>Pub/Sub</strong><small>Future ingestion</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="capability-grid">
        {capabilities.map((capability, index) => (
          <article className="capability-card" key={capability.title}>
            <div className="capability-icon"><Icon name={capability.icon} size={19} /></div>
            <span className="mono subtle">0{index + 1}</span>
            <h2>{capability.title}</h2>
            <strong>{capability.service}</strong>
            <p>{capability.detail}</p>
          </article>
        ))}
      </section>

      <section className="architecture-bottom-grid">
        <article className="panel decision-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">DECISION RECORDS</span><h2>Tradeoffs made explicit</h2></div>
            <Icon name="file-check" size={20} />
          </div>
          <div className="decision-list">
            {decisions.map((decision) => (
              <div className="decision-row" key={decision.id}>
                <span className="mono">{decision.id}</span>
                <div><strong>{decision.title}</strong><p>{decision.detail}</p></div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel boundary-panel">
          <span className="eyebrow">FAILURE BOUNDARIES</span>
          <h2>Designed to degrade clearly</h2>
          <ul className="boundary-list">
            <li><Icon name="check" size={15} /><span><strong>API unavailable</strong>The Pages demo stays local; an API-configured client fails visibly.</span></li>
            <li><Icon name="check" size={15} /><span><strong>Process restart</strong>Reference API history resets; the one-instance cap prevents divergent copies.</span></li>
            <li><Icon name="check" size={15} /><span><strong>Invalid payload</strong>Strict models reject unknown fields and return a request ID.</span></li>
            <li><Icon name="check" size={15} /><span><strong>Duplicate request</strong>Idempotency keys replay the original result or reject conflicting input.</span></li>
          </ul>
        </article>
      </section>
    </div>
  );
}
