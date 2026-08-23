(() => {
  "use strict";

  const STORAGE_KEY = "str8n-up-room-reset-plan";
  const emptyPlan = {
    situation: "",
    space: "",
    outcome: "",
    obstacle: "",
    focus: "",
    urgency: "",
    format: "",
    location: "",
    notes: "",
  };

  const situations = [
    ["Everyday clutter", "A room has drifted out of order and needs a workable reset"],
    ["Move or unpacking", "Prepare for a move, purge before packing, or settle into a new home"],
    ["Downsizing or estate", "Make careful decisions through a major household transition"],
    ["ADHD-friendly systems", "Create visible, low-friction systems that are easier to maintain"],
    ["Home office or business", "Reduce distraction and make work materials easier to find"],
    ["Maintenance reset", "Refresh systems that worked before but have started to slip"],
  ];

  const focusOptions = [
    "About 30 minutes",
    "1–2 focused hours",
    "3+ focused hours",
    "Not sure yet",
  ];

  const formatOptions = {
    "In person": "Hands-on support",
    Virtual: "Flexible guidance",
    "DIY plan": "Assessment + action plan",
    "Not sure yet": "Let Jennifer guide the fit",
  };

  const spaceSteps = {
    "Kitchen / pantry": [
      "Choose one counter or shelf as the working zone.",
      "Group daily-use, occasional-use, and expired or duplicate items.",
      "Give the highest-use items the easiest-to-reach homes.",
    ],
    "Closet / bedroom": [
      "Clear one small surface so decisions have a landing place.",
      "Sort by keep, relocate, donate, and decide-later.",
      "Reserve prime space for what is worn or used now.",
    ],
    "Home office": [
      "Define the work that must happen in this space.",
      "Separate active work from reference and archive material.",
      "Create one capture point for incoming paper and tasks.",
    ],
    "Garage / storage": [
      "Mark a safe sorting lane before moving anything heavy.",
      "Group items by use, season, and disposal path.",
      "Measure shelving and wall space before buying containers.",
    ],
    "Paper / digital": [
      "Collect one bounded category—do not start with every file.",
      "Separate action, reference, archive, and secure disposal.",
      "Choose one naming or filing rule that can be repeated.",
    ],
    "Whole home / move": [
      "Choose the first room by urgency and daily impact.",
      "Define what must move, leave, donate, or be decided later.",
      "Finish one visible zone before opening another.",
    ],
    "Something else": [
      "Name the smallest visible area that would create relief.",
      "Decide what belongs, what moves, and what can leave.",
      "Create one simple rule for maintaining the reset.",
    ],
  };

  const plan = { ...emptyPlan };
  let toastTimer;

  const byId = (id) => document.getElementById(id);
  const displayValue = (value, fallback = "—") => value.trim() || fallback;

  function serviceLane() {
    if (plan.format === "Virtual") return "Virtual organizing";
    if (plan.format === "DIY plan") return "DIY consultation + action plan";
    if (plan.situation === "Move or unpacking") return "Moving / unpacking support";
    if (plan.situation === "Downsizing or estate") return "Downsizing / estate support";
    if (plan.situation === "Home office or business") return "Business productivity organizing";
    if (plan.situation === "ADHD-friendly systems") return "Residential organizing + coaching";
    if (plan.situation === "Maintenance reset") return "Maintenance / accountability reset";
    return "Residential organizing";
  }

  function starterSteps() {
    return spaceSteps[plan.space] || spaceSteps["Something else"];
  }

  function photoChecklist() {
    const items = [
      "One photo from the doorway showing the full space",
      "One close-up of the hardest or most frustrating area",
      "One photo of existing shelves, drawers, or storage",
    ];
    if (plan.space === "Garage / storage") {
      items.push("Rough measurements of usable walls and shelving");
    }
    if (plan.space === "Paper / digital") {
      items.push("A category overview only—hide account numbers and private records");
    }
    if (plan.situation === "Move or unpacking") {
      items.push("A quick count of boxes or major furniture involved");
    }
    return items;
  }

  function completedCount() {
    return [
      Boolean(plan.situation && plan.space),
      Boolean(plan.outcome && plan.obstacle),
      Boolean(plan.focus && plan.urgency),
      Boolean(plan.format && plan.location),
    ].filter(Boolean).length;
  }

  function resetBrief() {
    const lane = serviceLane();
    const steps = starterSteps();
    const photos = photoChecklist();
    return [
      "STR8N UP — ROOM RESET BRIEF",
      "",
      `SITUATION: ${displayValue(plan.situation, "Not provided")}`,
      `SPACE: ${displayValue(plan.space, "Not provided")}`,
      `LOCATION: ${displayValue(plan.location, "Not provided")}`,
      `DESIRED OUTCOME: ${displayValue(plan.outcome, "Not provided")}`,
      `MAIN OBSTACLE: ${displayValue(plan.obstacle, "Not provided")}`,
      `FOCUS CAPACITY: ${displayValue(plan.focus, "Not provided")}`,
      `URGENCY: ${displayValue(plan.urgency, "Not provided")}`,
      `PREFERRED FORMAT: ${displayValue(plan.format, "Not provided")}`,
      `POSSIBLE SERVICE LANE: ${lane}`,
      `NOTES: ${displayValue(plan.notes, "None provided")}`,
      "",
      "STARTER PLAN",
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      "",
      "PHOTO PREP",
      ...photos.map((item) => `• ${item}`),
      "",
      "Please confirm the best service, availability, scope, and pricing after the initial assessment.",
    ].join("\n");
  }

  function setList(id, items) {
    const list = byId(id);
    list.replaceChildren();
    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.append(listItem);
    });
  }

  function render() {
    const completed = completedCount();
    const remaining = 4 - completed;
    const ready = completed === 4;
    const lane = serviceLane();
    const photos = photoChecklist();

    byId("intro-progress").textContent = `${completed}/4`;
    byId("readiness").textContent = ready ? "Ready" : `${remaining} left`;
    byId("readiness").classList.toggle("ready", ready);
    byId("service-lane").textContent = lane;
    byId("result-copy").textContent = ready
      ? "You now have a focused starting point to discuss with Jennifer."
      : "Answer the four small sections and this brief will sharpen as you go.";

    byId("summary-space").textContent = displayValue(plan.space);
    byId("summary-outcome").textContent = displayValue(plan.outcome);
    byId("summary-focus").textContent = displayValue(plan.focus);
    byId("summary-format").textContent = displayValue(plan.format);

    setList("starter-steps", starterSteps());
    setList("photo-list", photos);
    byId("photo-count").textContent = `${photos.length} useful views`;

    document.querySelectorAll("[data-field][data-value]").forEach((button) => {
      const isActive = plan[button.dataset.field] === button.dataset.value;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    document.querySelectorAll("[data-input]").forEach((control) => {
      const field = control.dataset.input;
      if (control.value !== plan[field]) control.value = plan[field];
    });

    const subject = `Room reset inquiry — ${plan.space || "space TBD"}`;
    byId("email-summary").href = `mailto:jennifer@str8nup.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(resetBrief())}`;
  }

  function update(field, value) {
    plan[field] = value;
    render();
  }

  function optionButton(field, value, baseClass, description) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = baseClass;
    button.dataset.field = field;
    button.dataset.value = value;
    button.setAttribute("aria-pressed", "false");

    if (baseClass === "situation") {
      const strong = document.createElement("strong");
      const small = document.createElement("small");
      strong.textContent = value;
      small.textContent = description;
      button.append(strong, small);
    } else if (baseClass === "format-choice") {
      const label = document.createElement("span");
      const small = document.createElement("small");
      label.textContent = value;
      small.textContent = description;
      button.append(label, small);
    } else {
      button.textContent = value;
    }

    button.addEventListener("click", () => update(field, value));
    return button;
  }

  function buildOptions() {
    situations.forEach(([name, description]) => {
      byId("situation-options").append(optionButton("situation", name, "situation", description));
    });
    focusOptions.forEach((option) => {
      byId("focus-options").append(optionButton("focus", option, "choice"));
    });
    Object.entries(formatOptions).forEach(([name, description]) => {
      byId("format-options").append(optionButton("format", name, "format-choice", description));
    });
  }

  function flash(message) {
    const toast = byId("toast");
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2500);
  }

  async function copyBrief() {
    const brief = resetBrief();
    try {
      await navigator.clipboard.writeText(brief);
      flash("Reset brief copied");
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = brief;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      flash(copied ? "Reset brief copied" : "Copy unavailable—use the email button");
    }
  }

  function savePlan() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      flash("Plan saved on this device");
    } catch {
      flash("This browser could not save the plan");
    }
  }

  function clearPlan() {
    Object.assign(plan, emptyPlan);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The planner still resets if storage is unavailable.
    }
    render();
    flash("Fresh reset started");
  }

  function loadPlan() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      Object.keys(emptyPlan).forEach((field) => {
        if (typeof parsed[field] === "string") plan[field] = parsed[field];
      });
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage failures and continue with a fresh plan.
      }
    }
  }

  buildOptions();
  loadPlan();

  document.querySelectorAll("[data-input]").forEach((control) => {
    control.addEventListener("input", (event) => {
      update(event.currentTarget.dataset.input, event.currentTarget.value);
    });
  });
  byId("copy-summary").addEventListener("click", copyBrief);
  byId("save-plan").addEventListener("click", savePlan);
  byId("reset-plan").addEventListener("click", clearPlan);

  render();
})();
