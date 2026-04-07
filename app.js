const state = {
  rows: [],
  scored: []
};

const els = {
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  fileInput: document.getElementById("fileInput"),
  rawCsv: document.getElementById("rawCsv"),
  deliveryReadiness: document.getElementById("deliveryReadiness"),
  implementNow: document.getElementById("implementNow"),
  highRisk: document.getElementById("highRisk"),
  avgEffort: document.getElementById("avgEffort"),
  deliveryBar: document.getElementById("deliveryBar"),
  snapshotText: document.getElementById("snapshotText"),
  roadmapBody: document.querySelector("#roadmapTable tbody"),
  storiesPane: document.getElementById("storiesPane"),
  schemasPane: document.getElementById("schemasPane"),
  testsPane: document.getElementById("testsPane"),
  releasePane: document.getElementById("releasePane"),
  exportBriefBtn: document.getElementById("exportBriefBtn"),
  exportBacklogBtn: document.getElementById("exportBacklogBtn"),
  tabs: [...document.querySelectorAll(".tab")]
};

const SAMPLE_PATH = "./data/sample-intake.csv";

const REQUIRED_COLUMNS = [
  "feature_id",
  "feature_name",
  "business_domain",
  "business_value",
  "urgency",
  "implementation_effort",
  "risk_level",
  "stakeholders",
  "entities",
  "acceptance_focus"
];

const DOMAIN_SCHEMA_TEMPLATES = {
  sales: ["id UUID PRIMARY KEY", "account_id UUID", "order_total NUMERIC(12,2)", "status TEXT", "updated_at TIMESTAMP"],
  finance: ["id UUID PRIMARY KEY", "gl_code TEXT", "amount NUMERIC(14,2)", "effective_date DATE", "updated_at TIMESTAMP"],
  supply: ["id UUID PRIMARY KEY", "sku TEXT", "warehouse_id UUID", "quantity INT", "updated_at TIMESTAMP"],
  quality: ["id UUID PRIMARY KEY", "inspection_id UUID", "defect_type TEXT", "severity TEXT", "recorded_at TIMESTAMP"],
  operations: ["id UUID PRIMARY KEY", "plant_id UUID", "line_code TEXT", "event_type TEXT", "event_time TIMESTAMP"]
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function parseCsv(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV requires at least one header row and one data row.");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length) {
    throw new Error(`Missing required column(s): ${missing.join(", ")}`);
  }

  return lines.slice(1).map((line, idx) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ?? "";
    });
    row.__line = idx + 2;
    return row;
  });
}

function normalizeStakeholder(stakeholderRaw) {
  return stakeholderRaw
    .split(/[;|/]/)
    .map((s) => s.trim())
    .filter(Boolean)[0] || "Delivery Team";
}

function detectDomainKey(domain) {
  const d = String(domain).toLowerCase();
  if (d.includes("sale") || d.includes("customer")) return "sales";
  if (d.includes("finance") || d.includes("account")) return "finance";
  if (d.includes("supply") || d.includes("inventory") || d.includes("warehouse")) return "supply";
  if (d.includes("quality") || d.includes("compliance")) return "quality";
  return "operations";
}

function scoreFeature(row) {
  const value = clamp(toNumber(row.business_value, 5), 1, 10);
  const urgency = clamp(toNumber(row.urgency, 5), 1, 10);
  const effort = clamp(toNumber(row.implementation_effort, 5), 1, 10);
  const risk = clamp(toNumber(row.risk_level, 5), 1, 10);

  const rawScore =
    value * 0.38 +
    urgency * 0.28 +
    risk * 0.2 +
    (11 - effort) * 0.14;

  const priorityScore = clamp(rawScore * 10, 0, 100);
  const lane = priorityScore >= 75 ? "Now" : priorityScore >= 55 ? "Next" : "Later";
  const domainKey = detectDomainKey(row.business_domain);

  return {
    ...row,
    value,
    urgency,
    effort,
    risk,
    priorityScore,
    lane,
    domainKey,
    ownerGroup: normalizeStakeholder(row.stakeholders)
  };
}

function summarize(scored) {
  const avgPriority = scored.length
    ? scored.reduce((sum, row) => sum + row.priorityScore, 0) / scored.length
    : 0;
  const implementNow = scored.filter((r) => r.lane === "Now").length;
  const highRisk = scored.filter((r) => r.risk >= 8).length;
  const avgEffort = scored.length
    ? scored.reduce((sum, row) => sum + row.effort, 0) / scored.length
    : 0;

  return {
    avgPriority,
    implementNow,
    highRisk,
    avgEffort
  };
}

function buildStory(row) {
  return `As a ${row.ownerGroup}, I need ${row.feature_name.toLowerCase()} so that ${row.acceptance_focus}.`;
}

function buildSql(row) {
  const entities = row.entities
    .split(/[;|]/)
    .map((entity) => entity.trim())
    .filter(Boolean);

  const tableName = entities[0]
    ? entities[0].toLowerCase().replace(/[^a-z0-9]+/g, "_")
    : row.feature_name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  const cols = DOMAIN_SCHEMA_TEMPLATES[row.domainKey] || DOMAIN_SCHEMA_TEMPLATES.operations;

  return `CREATE TABLE ${tableName} (\n  ${cols.join(",\n  ")}\n);`;
}

function buildTests(row) {
  return [
    `Given required inputs for ${row.feature_name}, when submitted, then the workflow completes without validation errors.`,
    `Given invalid or missing inputs, when processed, then descriptive failure states are returned.`,
    `Given deployment to target environment, when regression is executed, then existing critical flows remain unaffected.`
  ];
}

function buildReleaseChecklist(scored) {
  const nowItems = scored.filter((r) => r.lane === "Now");
  const topRisks = scored.filter((r) => r.risk >= 8);

  return [
    `Confirm business sign-off on ${nowItems.length} "Now" lane feature(s).`,
    `Validate SQL migration plan and rollback strategy for generated schema updates.`,
    `Complete QA evidence for acceptance criteria on prioritized features.`,
    `Resolve or accept risk treatment plans for ${topRisks.length} high-risk feature(s).`,
    "Run post-deployment verification and monitor operational metrics for 24 hours."
  ];
}

function renderMetrics(summary) {
  els.deliveryReadiness.textContent = `${summary.avgPriority.toFixed(1)}%`;
  els.implementNow.textContent = String(summary.implementNow);
  els.highRisk.textContent = String(summary.highRisk);
  els.avgEffort.textContent = summary.avgEffort.toFixed(1);
  els.deliveryBar.style.width = `${summary.avgPriority.toFixed(1)}%`;

  const text = summary.avgPriority >= 78
    ? "Portfolio is in strong delivery shape. Focus on reducing high-risk dependencies before release windows."
    : summary.avgPriority >= 60
      ? "Portfolio is workable. Tight prioritization and effort balancing can improve release confidence quickly."
      : "Portfolio requires triage. Re-scope low-value work and reduce bottlenecks before scheduling delivery.";

  els.snapshotText.textContent = text;
}

function renderRoadmap(scored) {
  if (!scored.length) {
    els.roadmapBody.innerHTML = '<tr><td colspan="6" class="empty">No rows to display.</td></tr>';
    return;
  }

  const rows = [...scored]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((row) => {
      const laneClass = row.lane === "Now" ? "pill-now" : row.lane === "Next" ? "pill-next" : "pill-later";
      return `
        <tr>
          <td>${row.feature_name}</td>
          <td>${row.business_domain}</td>
          <td>${row.priorityScore.toFixed(1)}</td>
          <td><span class="pill ${laneClass}">${row.lane}</span></td>
          <td>${row.risk.toFixed(1)}</td>
          <td>${row.ownerGroup}</td>
        </tr>
      `;
    })
    .join("");

  els.roadmapBody.innerHTML = rows;
}

function renderStories(scored) {
  const html = scored
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 10)
    .map((row) => {
      return `
        <article class="artifact-item">
          <h4>${row.feature_id} - ${row.feature_name}</h4>
          <p>${buildStory(row)}</p>
        </article>
      `;
    })
    .join("");

  els.storiesPane.innerHTML = html || "<p>No stories available.</p>";
}

function renderSchemas(scored) {
  const html = scored
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8)
    .map((row) => {
      return `
        <article class="artifact-item">
          <h4>${row.feature_name}</h4>
          <pre>${buildSql(row)}</pre>
        </article>
      `;
    })
    .join("");

  els.schemasPane.innerHTML = html || "<p>No schema suggestions available.</p>";
}

function renderTests(scored) {
  const html = scored
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 10)
    .map((row) => {
      const tests = buildTests(row).map((t) => `<li>${t}</li>`).join("");
      return `
        <article class="artifact-item">
          <h4>${row.feature_name}</h4>
          <ul>${tests}</ul>
        </article>
      `;
    })
    .join("");

  els.testsPane.innerHTML = html || "<p>No tests available.</p>";
}

function renderRelease(scored) {
  const checklist = buildReleaseChecklist(scored)
    .map((item) => `<li>${item}</li>`)
    .join("");

  els.releasePane.innerHTML = `<article class="artifact-item"><ul>${checklist}</ul></article>`;
}

function renderArtifacts(scored) {
  renderStories(scored);
  renderSchemas(scored);
  renderTests(scored);
  renderRelease(scored);
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportBrief() {
  if (!state.scored.length) {
    alert("Run analysis before exporting.");
    return;
  }

  const summary = summarize(state.scored);
  const top = [...state.scored]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8)
    .map((row, idx) => `${idx + 1}. ${row.feature_name} | Priority ${row.priorityScore.toFixed(1)} | Lane ${row.lane} | Risk ${row.risk}`)
    .join("\n");

  const markdown = `# SpecForge Delivery Brief\n\n- Generated: ${new Date().toISOString()}\n- Intake scope: ${state.scored.length} features\n- Delivery readiness: ${summary.avgPriority.toFixed(1)}%\n- Implement now: ${summary.implementNow}\n- High-risk items: ${summary.highRisk}\n- Average effort: ${summary.avgEffort.toFixed(1)}\n\n## Top Priority Features\n${top}\n\n## Release Checklist\n${buildReleaseChecklist(state.scored).map((c) => `- ${c}`).join("\n")}\n`;

  download("specforge-delivery-brief.md", markdown, "text/markdown");
}

function exportBacklog() {
  if (!state.scored.length) {
    alert("Run analysis before exporting.");
    return;
  }

  const lines = ["feature_id,feature_name,business_domain,priority_score,lane,risk,owner_group"];
  [...state.scored]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .forEach((row) => {
      lines.push([
        row.feature_id,
        row.feature_name.replace(/,/g, " "),
        row.business_domain,
        row.priorityScore.toFixed(1),
        row.lane,
        row.risk.toFixed(1),
        row.ownerGroup.replace(/,/g, " ")
      ].join(","));
    });

  download("specforge-prioritized-backlog.csv", lines.join("\n"), "text/csv");
}

function switchTab(tabId) {
  const paneMap = {
    stories: els.storiesPane,
    schemas: els.schemasPane,
    tests: els.testsPane,
    release: els.releasePane
  };

  els.tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  Object.entries(paneMap).forEach(([id, pane]) => {
    pane.classList.toggle("hidden", id !== tabId);
  });
}

function runAnalysis() {
  const raw = els.rawCsv.value.trim();
  if (!raw) {
    alert("Paste or load CSV data first.");
    return;
  }

  try {
    const rows = parseCsv(raw);
    const scored = rows.map(scoreFeature);

    state.rows = rows;
    state.scored = scored;

    renderMetrics(summarize(scored));
    renderRoadmap(scored);
    renderArtifacts(scored);
  } catch (err) {
    alert(err.message);
  }
}

async function loadSample() {
  const res = await fetch(SAMPLE_PATH);
  els.rawCsv.value = (await res.text()).trim();
}

function handleUpload(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    els.rawCsv.value = String(reader.result || "").trim();
  };
  reader.readAsText(file);
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

els.loadSampleBtn.addEventListener("click", () => {
  loadSample().catch(() => {
    alert("Could not load sample data.");
  });
});
els.analyzeBtn.addEventListener("click", runAnalysis);
els.fileInput.addEventListener("change", handleUpload);
els.exportBriefBtn.addEventListener("click", exportBrief);
els.exportBacklogBtn.addEventListener("click", exportBacklog);

loadSample().catch(() => {
  // Non-blocking: sample load can fail in restricted contexts.
});
