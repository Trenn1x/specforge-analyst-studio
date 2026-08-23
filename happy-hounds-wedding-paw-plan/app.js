const fieldNames = [
  "couple", "date", "venue", "ceremonyTime", "photoTime", "petName",
  "petType", "age", "temperament", "careNotes", "serviceNeed", "outfit",
  "pickupLocation", "pickupTime", "arrivalTime", "returnLocation", "returnTime",
  "emergencyName", "emergencyPhone"
];

const state = {
  couple: "", date: "", venue: "", ceremonyTime: "", photoTime: "",
  petName: "", petType: "", age: "", temperament: "", careNotes: "",
  role: "", serviceNeed: "", outfit: "", pickupLocation: "", pickupTime: "",
  arrivalTime: "", returnLocation: "", returnTime: "", emergencyName: "",
  emergencyPhone: ""
};

const storageKey = "happy-hounds-wedding-paw-plan";
let activeStep = 0;
let toastTimer;
const el = (id) => document.getElementById(id);
const safe = (value, fallback = "Not provided") => String(value || "").trim() || fallback;

function formatTime(value) {
  if (!value) return "Time TBD";
  const [hourString, minute] = value.split(":");
  const hour = Number(hourString);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDate(value) {
  if (!value) return "Date TBD";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });
}

function sectionStatus() {
  return [
    Boolean(state.date && state.venue && state.ceremonyTime),
    Boolean(state.petName && state.petType && state.temperament),
    Boolean(state.role && state.serviceNeed),
    Boolean(state.pickupLocation && state.pickupTime && state.returnLocation && state.returnTime && state.emergencyPhone)
  ];
}

function timelineItems() {
  const items = [
    { time: state.pickupTime, label: `Pick up ${state.petName || "your pet"}`, detail: state.pickupLocation || "Pickup location TBD" },
    { time: state.arrivalTime, label: "Arrive & settle", detail: state.venue || "Venue TBD" },
    ...(state.photoTime ? [{ time: state.photoTime, label: "Portrait window", detail: state.outfit ? `Outfit: ${state.outfit}` : "Leash, water, treats, and photo-ready accessories" }] : []),
    ...(state.role !== "Home care only" ? [{ time: state.ceremonyTime, label: state.role || "Wedding moment", detail: "Exact cue and handoff to be confirmed with the planner" }] : []),
    { time: state.returnTime, label: `Return & settle ${state.petName || "your pet"}`, detail: state.returnLocation || "Return location TBD" }
  ];
  return items.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

function briefText() {
  const timeline = timelineItems().map((item) => `${formatTime(item.time)} — ${item.label}: ${item.detail}`).join("\n");
  return [
    "HAPPY HOUNDS — WEDDING PAW PLAN", "",
    `COUPLE: ${safe(state.couple)}`,
    `DATE: ${formatDate(state.date)}`,
    `VENUE: ${safe(state.venue)}`,
    `PET: ${safe([state.petName, state.petType, state.age].filter(Boolean).join(" · "))}`,
    `TEMPERAMENT: ${safe(state.temperament)}`,
    `CARE NOTES: ${safe(state.careNotes, "None provided")}`,
    `WEDDING ROLE: ${safe(state.role)}`,
    `CARE NEEDED: ${safe(state.serviceNeed)}`,
    `OUTFIT / ACCESSORIES: ${safe(state.outfit, "None provided")}`, "",
    "DRAFT TIMELINE", timeline, "",
    `EMERGENCY CONTACT: ${safe([state.emergencyName, state.emergencyPhone].filter(Boolean).join(" · "))}`, "",
    "Please confirm availability, service fit, exact timing, and a personalized quote."
  ].join("\n");
}

function renderTimeline() {
  const container = el("timeline");
  container.replaceChildren();
  timelineItems().forEach((item) => {
    const row = document.createElement("div");
    row.className = item.time ? "timeline-item filled" : "timeline-item";
    const time = document.createElement("time");
    time.textContent = formatTime(item.time);
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.label;
    const detail = document.createElement("p");
    detail.textContent = item.detail;
    content.append(title, detail);
    row.append(time, content);
    container.append(row);
  });
}

function render() {
  const status = sectionStatus();
  const completed = status.filter(Boolean).length;

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = Number(panel.dataset.panel) !== activeStep;
  });
  document.querySelectorAll("[data-step]").forEach((button) => {
    const selected = Number(button.dataset.step) === activeStep;
    button.classList.toggle("active", selected);
    if (selected) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
    const check = button.querySelector("i");
    if (check) check.hidden = !status[Number(button.dataset.step)];
  });
  document.querySelectorAll("[data-field='role']").forEach((button) => {
    button.classList.toggle("active", state.role === button.dataset.value);
  });

  el("back-button").hidden = activeStep === 0;
  el("next-button").hidden = activeStep === 4;
  el("preview-ready").textContent = `${completed}/4 ready`;
  el("preview-date").textContent = formatDate(state.date);
  el("preview-title").textContent = state.petName ? `${state.petName}’s big day` : "Your pet’s big day";
  el("preview-venue").textContent = state.venue || "Venue to be added";
  el("readiness-count").textContent = `${completed}/4`;
  el("readiness-bar").style.width = `${completed * 25}%`;
  el("final-title").textContent = completed === 4 ? "Your first draft is ready." : "A few details are still open.";

  const subject = `Wedding pet care — ${state.date ? formatDate(state.date) : "date TBD"}`;
  el("email-plan").href = `mailto:happyhounds712@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(briefText())}`;
  renderTimeline();
}

function goToStep(step) {
  activeStep = Math.max(0, Math.min(4, step));
  render();
  document.querySelector(".step-nav").scrollIntoView({ behavior: "smooth", block: "start" });
}

function flash(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2500);
}

fieldNames.forEach((field) => {
  el(field).addEventListener("input", (event) => {
    state[field] = event.target.value;
    render();
  });
});

document.querySelectorAll("[data-field='role']").forEach((button) => {
  button.addEventListener("click", () => {
    state.role = button.dataset.value;
    render();
  });
});

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => goToStep(Number(button.dataset.step)));
});

el("next-button").addEventListener("click", () => goToStep(activeStep + 1));
el("back-button").addEventListener("click", () => goToStep(activeStep - 1));

el("save-plan").addEventListener("click", () => {
  localStorage.setItem(storageKey, JSON.stringify(state));
  flash("Plan saved on this device");
});

el("copy-brief").addEventListener("click", async () => {
  await navigator.clipboard.writeText(briefText());
  flash("Wedding brief copied");
});

el("reset-plan").addEventListener("click", () => {
  Object.keys(state).forEach((key) => { state[key] = ""; });
  fieldNames.forEach((field) => { el(field).value = ""; });
  localStorage.removeItem(storageKey);
  activeStep = 0;
  render();
  flash("Fresh plan started");
});

try {
  Object.assign(state, JSON.parse(localStorage.getItem(storageKey) || "{}"));
  fieldNames.forEach((field) => { el(field).value = state[field] || ""; });
} catch {
  localStorage.removeItem(storageKey);
}

render();
