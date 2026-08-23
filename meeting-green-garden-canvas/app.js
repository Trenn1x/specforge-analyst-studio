const zoneMeta = {
  blank: { label: "Not mapped", short: "·" },
  sun: { label: "Full sun", short: "SUN" },
  part: { label: "Part sun", short: "PART" },
  shade: { label: "Shade", short: "SHADE" },
  wet: { label: "Wet / slow spot", short: "WET" },
};

const initial = {
  projectPath: "",
  bedShape: "Rectangle",
  length: "",
  width: "",
  zones: Array(24).fill("blank"),
  irrigation: "",
  drainage: "",
  style: "",
  goals: [],
  maintenance: "",
  location: "",
  timing: "",
  contactName: "",
  notes: "",
};

let state = { ...initial, zones: [...initial.zones], goals: [] };
let paintZone = "sun";
const $ = (selector) => document.querySelector(selector);

function toggle(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function counts() {
  return state.zones.reduce(
    (all, zone) => {
      all[zone] += 1;
      return all;
    },
    { blank: 0, sun: 0, part: 0, shade: 0, wet: 0 },
  );
}

function measurements() {
  if (!(state.length && state.width)) return "Measurements still open";
  const area = Number(state.length) * Number(state.width);
  return `${state.length} ft × ${state.width} ft · ~${
    Number.isFinite(area) && area ? Math.round(area) : "?"
  } sq ft`;
}

function lane() {
  if (state.projectPath === "Full design conversation") {
    return "Landscape design consultation";
  }
  if (
    state.goals.includes("Soften hardscape") ||
    state.notes.toLowerCase().includes("patio") ||
    state.notes.toLowerCase().includes("wall")
  ) {
    return "Design + site-fit conversation";
  }
  if (state.projectPath === "DIY plant guidance") {
    return "Retail photo + plant guidance";
  }
  return "Start with a quick project fit check";
}

function designLanguage() {
  const options = {
    "Formal + tailored": [
      "Evergreen rhythm",
      "Repeated planting blocks",
      "Restrained seasonal color",
    ],
    "Secret garden": ["Layered canopy", "Textural middle", "Soft, wandering edge"],
    "Native + loose": [
      "Native-leaning structure",
      "Grasses + perennials",
      "Seasonal pollinator color",
    ],
    "Color-forward": ["Evergreen anchor", "Flowering middle", "Rotating seasonal accents"],
    "Drought-wise": ["Tough structural anchor", "Fine grasses", "Low-water seasonal layer"],
  };
  return (
    options[state.style] || [
      "Choose a visual direction",
      "Map the strongest light",
      "Bring inspiration photos",
    ]
  );
}

function photos() {
  const total = counts();
  const list = [
    "One wide photo showing the full bed and nearby structure",
    "A photo from each end of the bed",
    "A close-up of the soil, mulch, and existing plants",
    "One photo around 9 a.m. and one around 3 p.m.",
  ];
  if (state.drainage === "Slow / standing water" || total.wet > 0) {
    list.push("The wet area after rain, including where water enters and exits");
  }
  if (state.irrigation && state.irrigation !== "None") {
    list.push("Irrigation heads, drip lines, or hose access");
  }
  if (state.goals.includes("Soften hardscape")) {
    list.push("Adjacent walls, paths, patio edges, and thresholds");
  }
  if (state.goals.includes("Pet / child-aware")) {
    list.push("The routes children or pets actually use through the space");
  }
  return list;
}

function questions() {
  const mapped = 24 - counts().blank;
  const list = [];
  if (!(state.length && state.width)) {
    list.push("Add rough length and width; final quantities still require a scaled plan.");
  }
  if (mapped < 6) {
    list.push("Map at least part of the bed so the strongest light constraint is visible.");
  }
  if (!state.drainage || state.drainage === "Not sure") {
    list.push("Drainage needs an on-site or post-rain check.");
  }
  if (state.goals.includes("Pet / child-aware")) {
    list.push("Ask staff to confirm plant safety for the specific household.");
  }
  if (state.projectPath === "Full design conversation") {
    list.push("Hardscape, grading, irrigation, and code or HOA constraints need site review.");
  }
  return list.length
    ? list
    : ["The first brief is coherent—bring photos and let the team verify plant and service fit."];
}

function listInto(element, items, checkboxes = false) {
  element.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      if (checkboxes) {
        const marker = document.createElement("span");
        marker.textContent = "□";
        li.append(marker);
      }
      li.append(document.createTextNode(item));
      return li;
    }),
  );
}

function brief() {
  const total = counts();
  const mapped = ["sun", "part", "shade", "wet"]
    .filter((zone) => total[zone])
    .map((zone) => `${zoneMeta[zone].label}: ${total[zone]} of 24 cells`)
    .join("; ");
  return [
    "MEETING GREEN — GARDEN CANVAS BRIEF",
    "",
    `Project path: ${state.projectPath || "Not selected"}`,
    `Bed: ${state.bedShape} · ${measurements()}`,
    `Light / site map: ${mapped || "Not mapped"}`,
    `Irrigation: ${state.irrigation || "Not provided"}`,
    `Drainage: ${state.drainage || "Not provided"}`,
    "",
    `Style: ${state.style || "Still open"}`,
    `Goals: ${state.goals.join(", ") || "Not selected"}`,
    `Maintenance appetite: ${state.maintenance || "Not provided"}`,
    `Location: ${state.location || "Not provided"}`,
    `Timing: ${state.timing || "Flexible / not provided"}`,
    `Name: ${state.contactName || "Not provided"}`,
    `Notes: ${state.notes || "None"}`,
    "",
    "DESIGN LANGUAGE TO DISCUSS",
    ...designLanguage().map((item) => `• ${item}`),
    "",
    "PHOTOS TO BRING",
    ...photos().map((item) => `• ${item}`),
    "",
    "QUESTIONS / REVIEW FLAGS",
    ...questions().map((item) => `• ${item}`),
    "",
    "Planning concept only. Meeting Green must verify site conditions, plant and service fit, inventory, quantities, pricing, availability, and final design.",
  ].join("\n");
}

function renderMap() {
  const map = $("#garden-map");
  map.replaceChildren(
    ...state.zones.map((zone, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `map-cell ${zone}`;
      button.setAttribute(
        "aria-label",
        `Cell ${index + 1}: ${zoneMeta[zone].label}. Paint ${zoneMeta[paintZone].label}.`,
      );
      const label = document.createElement("span");
      label.textContent = zoneMeta[zone].short;
      button.append(label);
      button.addEventListener("click", () => {
        state.zones[index] = paintZone;
        render();
        $("#save").textContent = "Save this canvas";
      });
      return button;
    }),
  );
}

function render() {
  const total = counts();
  const mapped = 24 - total.blank;
  const required = [
    state.projectPath,
    state.length && state.width,
    mapped >= 6,
    state.drainage,
    state.style,
    state.goals.length,
    state.location,
  ].filter(Boolean).length;
  const ready = required >= 6;

  renderMap();
  $("#mapped-count").textContent = `${mapped}/24 cells mapped`;
  $("#zone-summary").replaceChildren(
    ...["sun", "part", "shade", "wet"].map((zone) => {
      const item = document.createElement("span");
      item.className = zone;
      item.append(document.createTextNode(`${zoneMeta[zone].label} `));
      const value = document.createElement("strong");
      value.textContent = total[zone];
      item.append(value);
      return item;
    }),
  );
  $("#readiness").textContent = ready ? "Ready to discuss" : `${7 - required} details open`;
  $("#readiness").classList.toggle("ready", ready);
  $("#readiness-copy").textContent = ready
    ? "Enough context for a useful first conversation—not a plant list or quote."
    : "Add what you know. Unknowns are useful when they are named clearly.";
  $("#lane").textContent = lane();
  $("#dimensions").textContent = measurements();
  $("#direction").textContent = state.style || "Still open";
  if (mapped) {
    const dominant = ["sun", "part", "shade", "wet"].sort(
      (a, b) => total[b] - total[a],
    )[0];
    $("#dominant").textContent = zoneMeta[dominant].label;
  } else {
    $("#dominant").textContent = "Not mapped yet";
  }
  listInto($("#language"), designLanguage());
  listInto($("#photos"), photos().slice(0, 5), true);
  listInto($("#questions"), questions());
  $("#brief-text").textContent = brief();
}

function syncControls() {
  document.querySelectorAll("input[name], select[name], textarea[name]").forEach((control) => {
    if (Object.hasOwn(state, control.name)) control.value = state[control.name];
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

document.querySelectorAll("[data-zone]").forEach((button) => {
  button.addEventListener("click", () => {
    paintZone = button.dataset.zone;
    document.querySelectorAll("[data-zone]").forEach((tool) => {
      tool.classList.toggle("active", tool === button);
      tool.setAttribute("aria-pressed", String(tool === button));
    });
    renderMap();
  });
});

document.querySelectorAll("[data-single]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state[group.dataset.single] = button.dataset.value;
    syncControls();
    render();
    $("#save").textContent = "Save this canvas";
  });
});

document.querySelectorAll("[data-multi]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state[group.dataset.multi] = toggle(
      state[group.dataset.multi],
      button.dataset.value,
    );
    syncControls();
    render();
    $("#save").textContent = "Save this canvas";
  });
});

document.addEventListener("input", (event) => {
  if (!event.target.name || !Object.hasOwn(state, event.target.name)) return;
  state[event.target.name] = event.target.value;
  render();
  $("#save").textContent = "Save this canvas";
});

$("#save").addEventListener("click", () => {
  localStorage.setItem("meeting-green-garden-canvas", JSON.stringify(state));
  $("#save").textContent = "Saved on this device";
});

async function copyBrief(button) {
  try {
    await navigator.clipboard.writeText(brief());
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = "Copy brief";
    }, 1800);
  } catch {
    button.textContent = "Open preview below";
    $(".brief-preview").open = true;
  }
}

$("#copy").addEventListener("click", () => copyBrief($("#copy")));
$("#copy-two").addEventListener("click", () => copyBrief($("#copy-two")));

$("#reset").addEventListener("click", () => {
  state = { ...initial, zones: [...initial.zones], goals: [] };
  paintZone = "sun";
  localStorage.removeItem("meeting-green-garden-canvas");
  document.querySelectorAll("[data-zone]").forEach((tool) => {
    const active = tool.dataset.zone === "sun";
    tool.classList.toggle("active", active);
    tool.setAttribute("aria-pressed", String(active));
  });
  syncControls();
  render();
  $("#save").textContent = "Save this canvas";
});

$("#email").addEventListener("click", () => {
  const subject = encodeURIComponent("Garden bed question — Garden Canvas");
  const body = encodeURIComponent(
    `Hi Meeting Green team,\n\nI mapped the basics of my garden bed below and will attach the photos separately. Would you point me toward the right next step—retail plant guidance, a DIY plan, or a design consultation?\n\n${brief()}\n\nThanks,\n${state.contactName || ""}`,
  );
  window.location.href =
    `mailto:hello@meetinggreenchs.com?subject=${subject}&body=${body}`;
});

try {
  const saved = JSON.parse(localStorage.getItem("meeting-green-garden-canvas"));
  if (saved) {
    state = {
      ...initial,
      ...saved,
      zones:
        Array.isArray(saved.zones) && saved.zones.length === 24
          ? saved.zones
          : [...initial.zones],
      goals: Array.isArray(saved.goals) ? saved.goals : [],
    };
    $("#save").textContent = "Saved on this device";
  }
} catch {
  localStorage.removeItem("meeting-green-garden-canvas");
}

syncControls();
render();
