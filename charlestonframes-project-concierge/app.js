const STORAGE_KEY = "charlestonframes-project-brief";

const defaults = {
  intent: "New framing quote",
  artworkType: "",
  width: "",
  height: "",
  depth: "",
  conditions: [],
  room: "",
  wallColor: "",
  light: "",
  moisture: "",
  surface: "",
  style: "Open to Ben’s guidance",
  frameTone: "",
  matPreference: "",
  glazingPriority: "",
  timing: "",
  budget: "",
  name: "",
  notes: ""
};

let project = { ...defaults, conditions: [] };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function photoChecklist() {
  const items = [
    "One straight-on photo of the entire piece",
    "The back, edges, labels, and any signature",
    "A ruler in frame to confirm overall size"
  ];
  if (project.conditions.some((item) => ["Brittle or aged", "Has visible damage", "I’m not sure"].includes(item))) {
    items.push("Close-ups of any wear, ripples, stains, or damage");
  }
  if (project.artworkType === "Object or memorabilia" || project.conditions.includes("Dimensional or unusual")) {
    items.push("A side view showing the object’s deepest point");
  }
  if (project.room || project.wallColor || project.surface) {
    items.push("A wide photo of the wall and nearby furniture");
  }
  return items;
}

function humanQuestions() {
  const items = [
    "Which mounting and glazing approach is appropriate after seeing the piece?",
    "Which frame, mat, and material combinations are actually available?"
  ];
  if (project.intent === "New framing quote") {
    items.push("What can be estimated only after an in-person condition and measurement check?");
  }
  if (project.timing) {
    items.push("Is the requested timing realistic for this particular project?");
  }
  if (project.intent !== "Video consultation") {
    items.push("What appointment timing and shop details should be confirmed by email?");
  }
  return items;
}

function dimensions() {
  if (!project.width || !project.height) return "Not measured yet";
  return `${project.width} × ${project.height}${project.depth ? ` × ${project.depth}` : ""} in (customer-measured)`;
}

function buildBrief() {
  return [
    "CHARLESTONFRAMES PROJECT BRIEF",
    "",
    `Request: ${project.intent}`,
    `Customer: ${project.name || "Not added"}`,
    `Artwork: ${project.artworkType || "Not selected"}`,
    `Approx. dimensions: ${dimensions()}`,
    `Condition / context: ${project.conditions.length ? project.conditions.join(", ") : "Nothing flagged yet"}`,
    "",
    "DISPLAY CONTEXT",
    `Room: ${project.room || "Not added"}`,
    `Wall: ${[project.wallColor, project.surface].filter(Boolean).join(" / ") || "Not added"}`,
    `Light exposure: ${project.light || "Not added"}`,
    `Moisture area: ${project.moisture || "Not added"}`,
    "",
    "DESIGN DIRECTION",
    `Overall feel: ${project.style}`,
    `Frame tone: ${project.frameTone || "Open"}`,
    `Mat preference: ${project.matPreference || "Open"}`,
    `Glazing priority: ${project.glazingPriority || "Needs guidance"}`,
    "",
    "TIMING + PARAMETERS",
    `Timing: ${project.timing || "Not added"}`,
    `Budget comfort: ${project.budget || "Prefer to discuss"}`,
    `Notes: ${project.notes || "None"}`,
    "",
    "PHOTOS I CAN PROVIDE",
    ...photoChecklist().map((item) => `• ${item}`),
    "",
    "QUESTIONS FOR BEN",
    ...humanQuestions().map((item) => `• ${item}`),
    "",
    "Customer-created planning brief only — not a quote, inspection, booking, or material hold."
  ].join("\n");
}

function renderList(selector, items, marker) {
  const list = $(selector);
  list.replaceChildren();
  items.forEach((item) => {
    const li = document.createElement("li");
    const bullet = document.createElement("b");
    bullet.textContent = marker;
    li.append(bullet, document.createTextNode(item));
    list.append(li);
  });
}

function render() {
  $$("[data-artwork]").forEach((button) => {
    const selected = button.dataset.artwork === project.artworkType;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $$("[data-condition]").forEach((button) => {
    const selected = project.conditions.includes(button.dataset.condition);
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $$("[data-style]").forEach((button) => {
    const selected = button.dataset.style === project.style;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const checks = [project.artworkType, project.width && project.height, project.room, project.style, project.timing, project.name];
  const readiness = checks.filter(Boolean).length;
  $("#readiness-count").textContent = `${readiness}/6 details`;
  $("#readiness-bar").style.width = `${Math.max(readiness, .35) / 6 * 100}%`;
  $("#readiness-label").textContent = readiness >= 6
    ? "Ready for a useful conversation"
    : readiness >= 3
      ? "Good start — a few useful gaps"
      : "Start with the artwork";

  $("#summary-intent").textContent = project.intent;
  $("#summary-artwork").textContent = project.artworkType || "Choose a type";
  $("#summary-style").textContent = project.style;
  $("#summary-room").textContent = project.room || "Add a room";
  $("#art-preview-name").textContent = project.artworkType ? project.artworkType.split(" ")[0] : "Your piece";
  $("#art-preview-size").textContent = project.width && project.height ? `${project.width} × ${project.height} in` : "add rough dimensions";

  renderList("#photo-list", photoChecklist(), "✓");
  renderList("#question-list", humanQuestions(), "?");

  const brief = buildBrief();
  const subject = `Framing project brief${project.name ? ` — ${project.name}` : ""}`;
  $("#email-brief").href = `mailto:eastboundben@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(brief)}`;
}

function syncForm() {
  $$("[data-field]").forEach((element) => {
    const key = element.dataset.field;
    element.value = project[key] || "";
  });
}

$$("[data-field]").forEach((element) => {
  const eventName = element.tagName === "SELECT" ? "change" : "input";
  element.addEventListener(eventName, () => {
    project[element.dataset.field] = element.value;
    $("#save-brief").textContent = "Save on this device";
    render();
  });
});

$$("[data-artwork]").forEach((button) => {
  button.addEventListener("click", () => {
    project.artworkType = button.dataset.artwork;
    render();
  });
});

$$("[data-condition]").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.condition;
    project.conditions = project.conditions.includes(value)
      ? project.conditions.filter((item) => item !== value)
      : [...project.conditions, value];
    render();
  });
});

$$("[data-style]").forEach((button) => {
  button.addEventListener("click", () => {
    project.style = button.dataset.style;
    render();
  });
});

$("#copy-brief").addEventListener("click", async () => {
  const label = $("#copy-brief span");
  try {
    await navigator.clipboard.writeText(buildBrief());
    label.textContent = "Brief copied";
  } catch {
    label.textContent = "Copy unavailable";
  }
  window.setTimeout(() => { label.textContent = "Copy clean brief"; }, 1800);
});

$("#save-brief").addEventListener("click", () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  $("#save-brief").textContent = "Saved on this device";
});

$("#reset-brief").addEventListener("click", () => {
  project = { ...defaults, conditions: [] };
  window.localStorage.removeItem(STORAGE_KEY);
  syncForm();
  $("#save-brief").textContent = "Save on this device";
  render();
});

try {
  const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  if (stored && typeof stored === "object") {
    project = { ...defaults, ...stored, conditions: Array.isArray(stored.conditions) ? stored.conditions : [] };
    $("#save-brief").textContent = "Saved brief restored";
  }
} catch {
  window.localStorage.removeItem(STORAGE_KEY);
}

syncForm();
render();
