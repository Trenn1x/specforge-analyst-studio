const state = {
  bikeKind: "E-bike",
  focus: "Cuts out / loses assist",
  areas: ["Motor", "Display / controls"],
  recent: [],
  photos: [],
};

const systems = [
  ["Battery", "BAT", "Pack, mount, key, range"],
  ["Charger", "CHG", "Brick, port, indicators"],
  ["Motor", "MTR", "Hub or mid-drive"],
  ["Display / controls", "DSP", "Screen, buttons, code"],
  ["Wiring / connectors", "WIR", "Visible cable or plug"],
  ["Brakes", "BRK", "Lever, pad, rotor"],
  ["Gears / drivetrain", "DRV", "Chain, shifting, crank"],
  ["Wheels / tires", "WHL", "Tire, tube, rim, spoke"],
  ["Frame / other", "OTH", "Anything else"],
];
const recentOptions = ["After storage", "After charging", "After rain / wet ride", "After a fall / impact", "After a part change", "Gradually over time", "Nothing obvious"];
const $ = (selector) => document.querySelector(selector);

function value(selector) { return $(selector).value.trim(); }
function lane() {
  if (state.bikeKind === "Conversion idea") return "Conversion project conversation";
  if (state.focus === "General tune-up" || (state.bikeKind === "Standard bike" && state.focus === "Brakes / gears / wheels")) return "Basic service conversation";
  if (state.focus === "Not sure yet") return "Ask Don where to start";
  return "Troubleshooting conversation";
}

function photoChecklist() {
  const list = ["Whole bike from the drive side", "Brand / model wording on the frame"];
  if (state.areas.includes("Display / controls") || state.focus === "Display or error code") list.push("Display while the code or warning is visible");
  if (state.areas.includes("Battery")) list.push("Battery label and mount—only if already visible");
  if (state.areas.includes("Charger")) list.push("Charger label, plug, and indicator");
  if (state.areas.includes("Motor")) list.push("Motor label or hub / crank area");
  if (state.areas.some((area) => ["Brakes", "Gears / drivetrain", "Wheels / tires", "Frame / other"].includes(area))) list.push("Close view of the affected mechanical area");
  return list;
}

function questions() {
  const result = [];
  if (!value("#brand")) result.push("What brand is printed on the bike?");
  if (!value("#model")) result.push("Is there a model name or frame label?");
  if (!state.areas.length) result.push("Which system or area seems involved?");
  if (!value("#symptoms")) result.push("What exactly happens when the issue appears?");
  if (state.focus === "Display or error code" && !value("#error-code")) result.push("What exact error code or warning appears?");
  if (value("#transport") === "Not sure yet") result.push("What transport or drop-off guidance is needed?");
  if (!value("#contact-email") && !value("#contact-phone")) result.push("How should Don reply?");
  return result;
}

function buildBrief() {
  const open = questions();
  const photos = photoChecklist();
  const contact = `${value("#contact-name") || "Name not added"}${value("#contact-email") ? ` · ${value("#contact-email")}` : ""}${value("#contact-phone") ? ` · ${value("#contact-phone")}` : ""}`;
  return `E-BIKE REPAIR CONVERSATION BRIEF

CONTACT
${contact}

BIKE
Type: ${state.bikeKind}
Brand / model: ${value("#brand") || "Not added"} / ${value("#model") || "Not added"}
Approximate year: ${value("#year") || "Not sure"}
Purchase source: ${value("#purchase-source")}

CONVERSATION STARTING POINT
${lane()}
Main concern: ${state.focus}
Areas involved: ${state.areas.length ? state.areas.join(", ") : "Not selected"}
Power / behavior: ${value("#power-behavior")}
Error code or display text: ${value("#error-code") || "None added"}
When it started: ${value("#started")}
Recent context: ${state.recent.length ? state.recent.join(", ") : "Nothing selected"}

OWNER’S DESCRIPTION
${value("#symptoms") || "No symptom description added."}

WHAT HAS ALREADY BEEN TRIED
${value("#attempted") || "Nothing added."}

DESIRED OUTCOME
${value("#goal") || "No specific outcome added."}

TRANSPORT
${value("#transport")}

PHOTO CHECKLIST
${photos.map((item) => `• ${item}${state.photos.includes(item) ? " — ready" : ""}`).join("\n")}

OPEN QUESTIONS
${open.length ? open.map((item) => `• ${item}`).join("\n") : "• Intake basics are organized; Don can confirm what matters next."}

PLEASE CONFIRM
Whether the bike should be brought in, the appropriate inspection/service path, safe transport instructions, parts/compatibility, availability, pricing, and timing.

PLANNER LIMITS
This independent concept does not diagnose the bike, declare it or its battery safe to ride/handle/transport, provide disassembly instructions, confirm compatibility or parts, choose the final service level, quote, schedule, take payment, or guarantee a repair.`;
}

function renderSystems() {
  const root = $("#system-grid");
  root.replaceChildren();
  systems.forEach(([name, code, note]) => {
    const selected = state.areas.includes(name);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `system-card${selected ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(selected));
    button.innerHTML = `<span class="system-code">${code}</span><span><b>${name}</b><small>${note}</small></span><i>${selected ? "✓" : "+"}</i>`;
    button.addEventListener("click", () => {
      state.areas = selected ? state.areas.filter((item) => item !== name) : [...state.areas, name];
      state.photos = state.photos.filter((item) => photoChecklist().includes(item));
      renderSystems();
      update();
    });
    root.append(button);
  });
}

function renderRecent() {
  const root = $("#recent-grid");
  root.replaceChildren();
  recentOptions.forEach((name) => {
    const button = document.createElement("button");
    const selected = state.recent.includes(name);
    button.type = "button";
    button.textContent = name;
    button.className = selected ? "selected" : "";
    button.setAttribute("aria-pressed", String(selected));
    button.addEventListener("click", () => {
      state.recent = selected ? state.recent.filter((item) => item !== name) : [...state.recent, name];
      renderRecent();
      update();
    });
    root.append(button);
  });
}

function renderPhotos() {
  const list = photoChecklist();
  const root = $("#photo-items");
  root.replaceChildren();
  list.forEach((name) => {
    const button = document.createElement("button");
    const selected = state.photos.includes(name);
    button.type = "button";
    button.className = selected ? "done" : "";
    button.setAttribute("aria-pressed", String(selected));
    const mark = document.createElement("span");
    mark.textContent = selected ? "✓" : "○";
    button.append(mark, document.createTextNode(name));
    button.addEventListener("click", () => {
      state.photos = selected ? state.photos.filter((item) => item !== name) : [...state.photos, name];
      renderPhotos();
      update();
    });
    root.append(button);
  });
  $("#photo-count").textContent = `${state.photos.length}/${list.length} ready`;
}

function update() {
  const open = questions();
  const identity = [value("#brand"), value("#model")].filter(Boolean).join(" · ") || "Not added";
  $("#lane").textContent = lane();
  $("#snap-bike").textContent = state.bikeKind;
  $("#snap-identity").textContent = identity;
  $("#snap-focus").textContent = state.focus;
  $("#snap-areas").textContent = state.areas.length ? `${state.areas.length} marked` : "None marked";
  $("#snap-open").textContent = `${open.length} ${open.length === 1 ? "question" : "questions"}`;
  $("#area-count").textContent = String(state.areas.length).padStart(2, "0");
  $("#next-question").textContent = open[0] || "The basics are organized. Don can confirm the next step.";
  $("#open-count").textContent = `${open.length} open`;
  const brief = buildBrief();
  $("#brief-output").textContent = brief;
  const subject = `E-bike service question — ${value("#brand") || state.bikeKind}${value("#model") ? ` ${value("#model")}` : ""}`;
  $("#email-brief").href = `mailto:don@charlestonEbikerepair.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(brief)}`;
  renderPhotos();
}

function bindChoiceGrid(selector, stateKey) {
  $(selector).addEventListener("click", (event) => {
    const button = event.target.closest("[data-value]");
    if (!button) return;
    state[stateKey] = button.dataset.value;
    document.querySelectorAll(`${selector} [data-value]`).forEach((item) => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    update();
  });
}

bindChoiceGrid("#bike-kind", "bikeKind");
bindChoiceGrid("#focus-grid", "focus");
["#brand", "#model", "#year", "#purchase-source", "#transport", "#power-behavior", "#started", "#error-code", "#symptoms", "#attempted", "#contact-name", "#contact-email", "#contact-phone", "#goal"].forEach((selector) => $(selector).addEventListener("input", update));

$("#copy-brief").addEventListener("click", async () => {
  const button = $("#copy-brief");
  try {
    await navigator.clipboard.writeText(buildBrief());
    button.textContent = "Copied";
    window.setTimeout(() => { button.textContent = "Copy brief"; }, 2200);
  } catch {
    button.textContent = "Select the brief above";
  }
});

renderSystems();
renderRecent();
update();
