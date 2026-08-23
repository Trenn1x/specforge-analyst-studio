const fields = ["location", "year", "make", "model", "details", "urgency", "timing"];
const state = { location: "", coverage: "", year: "", make: "", model: "", service: "", drivable: "", urgency: "", timing: "", details: "" };
const storageKey = "king-mobile-care-request";

const el = (id) => document.getElementById(id);
const display = (value, fallback = "—") => value.trim() || fallback;

function summaryText() {
  const vehicle = [state.year, state.make, state.model].filter(Boolean).join(" ");
  return [
    "KING MOBILE CARE REQUEST", "",
    `LOCATION: ${display(state.location, "Not provided")}`,
    `SERVICE AREA: ${display(state.coverage, "Not provided")}`,
    `VEHICLE: ${display(vehicle, "Not provided")}`,
    `SERVICE NEEDED: ${display(state.service, "Not provided")}`,
    `SAFE TO MOVE: ${display(state.drivable, "Not provided")}`,
    `URGENCY: ${display(state.urgency, "Not provided")}`,
    `PREFERRED TIME: ${display(state.timing, "Not provided")}`,
    `NOTES: ${display(state.details, "None")}`, "",
    "Please confirm whether this is a fit for mobile service, along with availability and pricing."
  ].join("\n");
}

function completedCount() {
  return [state.location && state.coverage, state.year && state.make && state.model, state.service, state.drivable, state.urgency && state.timing].filter(Boolean).length;
}

function render() {
  const completed = completedCount();
  const ready = completed === 5;
  const needsCall = state.coverage === "Outside / not sure" || state.drivable === "No — it may be unsafe";
  const vehicle = [state.year, state.make, state.model].filter(Boolean).join(" ");

  el("progress-count").textContent = `${completed}/5`;
  el("progress-bar").style.width = `${completed * 20}%`;
  document.querySelector(".progress-track").setAttribute("aria-label", `${completed} of 5 sections complete`);
  el("status-copy").textContent = ready ? "Request ready" : `${5 - completed} sections left`;
  el("status-light").classList.toggle("ready", ready);
  el("result-title").textContent = !ready ? "Your request is taking shape" : needsCall ? "A quick call should come first" : "Ready for a mobile-service conversation";
  el("result-copy").textContent = !ready ? "Finish the five quick sections to create a clean request for the mechanic." : needsCall ? "Your notes are organized, but service area or vehicle safety needs direct confirmation from the team." : "This looks ready to send. King Mobile still needs to confirm availability, service fit, and pricing.";
  el("summary-location").textContent = display(state.location);
  el("summary-vehicle").textContent = display(vehicle);
  el("summary-service").textContent = display(state.service);
  el("summary-drivable").textContent = display(state.drivable);
  el("summary-timing").textContent = state.urgency && state.timing ? `${state.urgency} · ${state.timing}` : "—";

  const subject = `Mobile service request — ${vehicle || "vehicle"}`;
  el("email-request").href = `mailto:kingmobileautomotive@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summaryText())}`;
  el("email-request").classList.toggle("muted", !ready);
  document.querySelectorAll("[data-field]").forEach((button) => button.classList.toggle("active", state[button.dataset.field] === button.dataset.value));
}

let toastTimer;
function flash(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600);
}

fields.forEach((field) => {
  el(field).addEventListener("input", (event) => { state[field] = event.target.value; render(); });
});

document.querySelectorAll("[data-field]").forEach((button) => {
  button.addEventListener("click", () => { state[button.dataset.field] = button.dataset.value; render(); });
});

el("copy-request").addEventListener("click", async () => {
  await navigator.clipboard.writeText(summaryText());
  flash("Request copied");
});

el("save-request").addEventListener("click", () => {
  localStorage.setItem(storageKey, JSON.stringify(state));
  flash("Saved on this device");
});

el("reset-request").addEventListener("click", () => {
  Object.keys(state).forEach((key) => { state[key] = ""; });
  fields.forEach((field) => { el(field).value = ""; });
  localStorage.removeItem(storageKey);
  render();
  flash("Started a fresh request");
});

try {
  Object.assign(state, JSON.parse(localStorage.getItem(storageKey) || "{}"));
  fields.forEach((field) => { el(field).value = state[field] || ""; });
} catch {
  localStorage.removeItem(storageKey);
}

el("care-form").addEventListener("submit", (event) => event.preventDefault());
render();
