const initial = {
  pieceType: "",
  quantity: "1",
  width: "",
  height: "",
  depth: "",
  material: "",
  currentFinish: "",
  conditions: [],
  goal: "",
  colorDirection: "",
  sheen: "",
  hardware: "",
  location: "",
  transport: "",
  access: [],
  timing: "",
  contactName: "",
  notes: "",
};

let state = { ...initial, conditions: [], access: [] };
const form = document.querySelector("#piece-form");
const $ = (selector) => document.querySelector(selector);

function toggle(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function textList(element, items, checkboxes = false) {
  element.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      if (checkboxes) {
        const mark = document.createElement("span");
        mark.textContent = "□";
        li.append(mark);
      }
      li.append(document.createTextNode(item));
      return li;
    }),
  );
}

function photosForPlan() {
  const photos = [
    "One full-piece photo, straight on",
    "Each side, the back, and the top",
    "Hardware, joints, labels, and underside",
  ];
  if (state.conditions.some((item) => item !== "Not sure yet")) {
    photos.push("Close-ups of every marked condition issue");
  }
  if (state.conditions.includes("Veneer damage") || state.material === "Not sure") {
    photos.push("A close detail of edges and wood grain");
  }
  if (state.transport.includes("Pickup") || state.access.length) {
    photos.push("Doorway, stairs, or loading path if transport help is requested");
  }
  return photos;
}

function flagsForPlan() {
  const flags = [];
  if (!(state.width && state.height && state.depth)) {
    flags.push("Add all three overall dimensions for a clearer scope.");
  }
  if (!state.material || state.material === "Not sure") {
    flags.push("Material or veneer may need confirmation from photos or in person.");
  }
  if (
    state.conditions.includes("Loose joints / wobble") ||
    state.conditions.includes("Veneer damage")
  ) {
    flags.push("Repair or structural concerns need a hands-on professional assessment.");
  }
  if (state.transport === "Pickup request") {
    flags.push(
      "Pickup for smaller pieces is limited to James or Johns Island and requires confirmation.",
    );
  }
  if (state.transport === "Moving help for a large piece") {
    flags.push("Large-piece moving support requires separate coordination.");
  }
  return flags.length
    ? flags
    : ["No obvious prep gaps—attach the photos below and ask for Sara’s review."];
}

function conversationLane() {
  if (state.conditions.includes("Loose joints / wobble")) {
    return "Repair + finish assessment";
  }
  if (state.goal === "Painted transformation" || state.goal === "Mix paint + wood") {
    return "Painted furniture conversation";
  }
  if (
    state.goal === "Restore original character" ||
    state.goal === "Refinish natural wood"
  ) {
    return "Traditional refinishing / restoration";
  }
  return "Design + service-fit conversation";
}

function dimensions() {
  return state.width && state.height && state.depth
    ? `${state.width}" W × ${state.height}" H × ${state.depth}" D`
    : "Not complete yet";
}

function makeBrief() {
  const photos = photosForPlan();
  return [
    "AGAINST THE GRAIN — PIECE BRIEF",
    "",
    `Piece: ${state.pieceType || "Not selected"}${
      state.quantity ? ` (qty. ${state.quantity})` : ""
    }`,
    `Dimensions: ${dimensions()}`,
    `Material: ${state.material || "Not sure"}`,
    `Current finish: ${state.currentFinish || "Not provided"}`,
    `Condition: ${state.conditions.join(", ") || "Not provided"}`,
    "",
    `Direction: ${state.goal || "Not selected"}`,
    `Color / style: ${state.colorDirection || "Open to guidance"}`,
    `Sheen: ${state.sheen || "Open to guidance"}`,
    `Hardware: ${state.hardware || "Open to guidance"}`,
    "",
    `Location: ${state.location || "Not provided"}`,
    `Transport: ${state.transport || "Not selected"}`,
    `Access: ${state.access.join(", ") || "Not provided"}`,
    `Timing: ${state.timing || "Flexible / not provided"}`,
    `Name: ${state.contactName || "Not provided"}`,
    `Notes: ${state.notes || "None"}`,
    "",
    "PHOTO CHECKLIST",
    ...photos.map((photo) => `• ${photo}`),
    "",
    "This brief is for planning only. Final service fit, scope, transport, pricing, and timing require Against The Grain’s review.",
  ].join("\n");
}

function render() {
  const required = [
    state.pieceType,
    state.width && state.height && state.depth,
    state.material,
    state.currentFinish,
    state.conditions.length,
    state.goal,
    state.location,
    state.transport,
  ].filter(Boolean).length;
  const ready = required >= 7;
  const missing = 8 - required;

  $("#brief-title").textContent = state.pieceType || "Your furniture piece";
  $("#readiness").textContent = ready ? "Brief ready" : "Needs a few details";
  $("#readiness").classList.toggle("ready", ready);
  $("#readiness-detail").textContent = ready
    ? "You’ve covered the basics needed for a useful first conversation."
    : `${missing} core ${missing === 1 ? "detail" : "details"} still open.`;
  $("#lane").textContent = conversationLane();
  $("#dimensions").textContent = dimensions();
  $("#direction").textContent = state.goal || "Still open";
  textList($("#photos"), photosForPlan(), true);
  textList($("#flags"), flagsForPlan());
  $("#brief-text").textContent = makeBrief();
}

function syncControls() {
  form.querySelectorAll("input, select, textarea").forEach((control) => {
    if (control.name && Object.hasOwn(state, control.name)) {
      control.value = state[control.name];
    }
  });

  document.querySelectorAll("[data-single]").forEach((group) => {
    const key = group.dataset.single;
    group.querySelectorAll("button").forEach((button) => {
      const selected = state[key] === button.dataset.value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.querySelector("i").textContent = selected ? "✓" : "+";
    });
  });

  document.querySelectorAll("[data-multi]").forEach((group) => {
    const key = group.dataset.multi;
    group.querySelectorAll("button").forEach((button) => {
      const selected = state[key].includes(button.dataset.value);
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = `${selected ? "✓" : "+"} ${button.dataset.value}`;
    });
  });
}

document.querySelectorAll("[data-single]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state[group.dataset.single] = button.dataset.value;
    syncControls();
    render();
    $("#save").textContent = "Save this plan";
  });
});

document.querySelectorAll("[data-multi]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const key = group.dataset.multi;
    state[key] = toggle(state[key], button.dataset.value);
    syncControls();
    render();
    $("#save").textContent = "Save this plan";
  });
});

form.addEventListener("input", (event) => {
  if (!event.target.name) return;
  state[event.target.name] = event.target.value;
  render();
  $("#save").textContent = "Save this plan";
});

$("#save").addEventListener("click", () => {
  localStorage.setItem("atg-piece-plan", JSON.stringify(state));
  $("#save").textContent = "Saved on this device";
});

$("#copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(makeBrief());
    $("#copy").textContent = "Copied";
    window.setTimeout(() => {
      $("#copy").textContent = "Copy brief";
    }, 1800);
  } catch {
    $("#copy").textContent = "Select + copy above";
    document.querySelector("details").open = true;
  }
});

$("#reset").addEventListener("click", () => {
  state = { ...initial, conditions: [], access: [] };
  localStorage.removeItem("atg-piece-plan");
  syncControls();
  render();
  $("#save").textContent = "Save this plan";
});

$("#email").addEventListener("click", () => {
  const subject = encodeURIComponent(
    `Furniture commission question${state.pieceType ? ` — ${state.pieceType}` : ""}`,
  );
  const body = encodeURIComponent(
    `Hi Sara,\n\nI put together the details below for a possible furniture project. I’ll attach the photos separately. Would this be a fit for Against The Grain?\n\n${makeBrief()}\n\nThank you,\n${state.contactName || ""}`,
  );
  window.location.href =
    `mailto:againstthegrainchs@gmail.com?subject=${subject}&body=${body}`;
});

try {
  const saved = JSON.parse(localStorage.getItem("atg-piece-plan"));
  if (saved) {
    state = {
      ...initial,
      ...saved,
      conditions: Array.isArray(saved.conditions) ? saved.conditions : [],
      access: Array.isArray(saved.access) ? saved.access : [],
    };
    $("#save").textContent = "Saved on this device";
  }
} catch {
  localStorage.removeItem("atg-piece-plan");
}

syncControls();
render();
