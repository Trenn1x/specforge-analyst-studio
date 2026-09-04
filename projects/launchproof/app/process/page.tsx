import { Icon, type IconName } from "@/components/icons";

const stages: Array<{ number: string; title: string; owner: string; icon: IconName; detail: string; exit: string }> = [
  {
    number: "01",
    title: "Shape",
    owner: "Product + engineering",
    icon: "layers",
    detail: "Turn the request into scope, acceptance criteria, risk, and a reversible first slice.",
    exit: "A small, reviewable plan",
  },
  {
    number: "02",
    title: "Build",
    owner: "Engineer",
    icon: "code",
    detail: "Implement against typed contracts with local tests, observability, and failure behavior.",
    exit: "Runnable change + evidence",
  },
  {
    number: "03",
    title: "Review",
    owner: "Peer reviewer",
    icon: "users",
    detail: "Challenge the design, inspect the diff, and verify AI-assisted changes are understood.",
    exit: "Approval or explicit revision",
  },
  {
    number: "04",
    title: "Prove",
    owner: "CI + accountable humans",
    icon: "file-check",
    detail: "Run build, test, security, performance, accessibility, and AI evaluation gates.",
    exit: "Traceable release verdict",
  },
  {
    number: "05",
    title: "Operate",
    owner: "Release owner",
    icon: "activity",
    detail: "Deploy a pinned artifact, observe the outcome, and keep rollback within reach.",
    exit: "Healthy service or rollback",
  },
];

const delegated = [
  "Scaffolding and repetitive implementation",
  "Test-case expansion and adversarial fixtures",
  "Competing implementation sketches",
  "Documentation drafts and change summaries",
];

const humanOwned = [
  "Architecture and trust boundaries",
  "Data contracts and acceptance criteria",
  "Security, privacy, and deployment decisions",
  "Final review of every accepted change",
];

export default function ProcessPage() {
  return (
    <div className="content-page process-page">
      <section className="page-heading narrative-heading">
        <div>
          <span className="eyebrow">DELIVERY STANDARD / v1.0</span>
          <h1>How a change earns release.</h1>
          <p>A lightweight team operating model for turning ambiguous work into a reviewed, supportable outcome.</p>
        </div>
        <a className="button dark" href="https://github.com/Trenn1x/specforge-analyst-studio/blob/main/projects/launchproof/CONTRIBUTING.md" target="_blank" rel="noreferrer">
          Contribution guide <Icon name="arrow-up-right" size={15} />
        </a>
      </section>

      <section className="stage-list" aria-label="Software delivery stages">
        {stages.map((stage) => (
          <article className="stage-card" key={stage.number}>
            <div className="stage-number">{stage.number}</div>
            <div className="stage-icon"><Icon name={stage.icon} size={20} /></div>
            <div className="stage-copy">
              <span className="eyebrow">{stage.owner}</span>
              <h2>{stage.title}</h2>
              <p>{stage.detail}</p>
            </div>
            <div className="stage-exit"><span>EXIT SIGNAL</span><strong>{stage.exit}</strong></div>
          </article>
        ))}
      </section>

      <section className="process-grid">
        <article className="panel ai-policy-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">AI-ASSISTED DEVELOPMENT</span><h2>Leverage, never authority</h2></div>
            <div className="policy-mark"><Icon name="spark" size={21} /></div>
          </div>
          <p className="section-intro">
            AI can increase implementation speed. It cannot own the problem, accept risk, or approve its own work.
          </p>
          <div className="ownership-grid">
            <div>
              <span className="ownership-label automated">SAFE TO DELEGATE</span>
              <ul>{delegated.map((item) => <li key={item}><Icon name="check" size={14} />{item}</li>)}</ul>
            </div>
            <div>
              <span className="ownership-label human">HUMAN-OWNED</span>
              <ul>{humanOwned.map((item) => <li key={item}><Icon name="shield" size={14} />{item}</li>)}</ul>
            </div>
          </div>
          <div className="acceptance-rule">
            <span>ACCEPTANCE RULE</span>
            <strong>If I cannot explain it, test it, and support it, I do not merge it.</strong>
          </div>
        </article>

        <article className="panel review-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">PULL REQUEST CONTRACT</span><h2>What reviewers receive</h2></div>
            <Icon name="git-branch" size={20} />
          </div>
          <ol className="review-list">
            <li><span>01</span><div><strong>Why this change exists</strong><p>Problem, user outcome, and intentionally excluded scope.</p></div></li>
            <li><span>02</span><div><strong>How it can fail</strong><p>Risk, security impact, rollback, and observability notes.</p></div></li>
            <li><span>03</span><div><strong>How it was proven</strong><p>Tests, screenshots when relevant, evaluation results, and manual checks.</p></div></li>
            <li><span>04</span><div><strong>Where AI contributed</strong><p>Assistance declared; accepted output remains the author’s responsibility.</p></div></li>
          </ol>
        </article>
      </section>

      <section className="artifact-strip">
        <div><span className="eyebrow">REPOSITORY EVIDENCE</span><h2>The team context is written down.</h2></div>
        <div className="artifact-links">
          <a href="https://github.com/Trenn1x/specforge-analyst-studio/tree/main/projects/launchproof/docs/adr" target="_blank" rel="noreferrer">Architecture decisions <Icon name="arrow-up-right" size={13} /></a>
          <a href="https://github.com/Trenn1x/specforge-analyst-studio/blob/main/projects/launchproof/docs/runbook.md" target="_blank" rel="noreferrer">Operations runbook <Icon name="arrow-up-right" size={13} /></a>
          <a href="https://github.com/Trenn1x/specforge-analyst-studio/blob/main/projects/launchproof/docs/threat-model.md" target="_blank" rel="noreferrer">Threat model <Icon name="arrow-up-right" size={13} /></a>
          <a href="https://github.com/Trenn1x/specforge-analyst-studio/blob/main/projects/launchproof/docs/delivery-plan.md" target="_blank" rel="noreferrer">Delivery plan <Icon name="arrow-up-right" size={13} /></a>
        </div>
      </section>
    </div>
  );
}
