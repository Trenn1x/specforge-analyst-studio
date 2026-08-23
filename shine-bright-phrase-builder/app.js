(() => {
  "use strict";

  const STORAGE_KEY = "shine-bright-party-plan";
  const emptyPlan = {
    phrase: "",
    service: "Marquee letters only",
    eventType: "",
    eventDate: "",
    location: "",
    setting: "",
    surface: "",
    power: "",
    access: "",
    glow: "Warm white",
    installWindow: "",
    contactName: "",
    notes: "",
  };
  const plan = { ...emptyPlan };
  const examples = ["PARTY", "I DO", "BABY", "GRAD", "40", "CHEERS"];
  const services = [
    ["Marquee letters only", "The phrase, delivery, professional setup, and pickup"],
    ["Letters + event styling", "Marquee display plus décor or broader event help"],
    ["Party Room + letters", "An intimate Mount Pleasant venue with a lit focal point"],
  ];
  const glows = ["Warm white", "Blush", "Lavender", "Electric blue", "Multicolor"];
  let toastTimer;

  const byId = (id) => document.getElementById(id);
  const valueOr = (value, fallback = "Not provided") => value.trim() || fallback;
  const cleanPhrase = (value) => value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").slice(0, 18);
  const glowClass = (glow) => `glow-${glow.toLowerCase().replace(/\s+/g, "-")}`;

  function billableCount() {
    return cleanPhrase(plan.phrase).replace(/\s/g, "").length;
  }

  function setupFlags() {
    const flags = [];
    if (plan.setting === "Outdoor") flags.push("Confirm a weather and wind plan for the display.");
    if (plan.power === "No nearby outlet") flags.push("Ask Heather about the safest power approach before event day.");
    if (plan.power === "Not sure") flags.push("Include an outlet photo or rough distance in the venue check.");
    if (plan.access === "Stairs / tight path") flags.push("Share access details so delivery and setup can be planned.");
    if (plan.surface === "Grass / soft ground") flags.push("Confirm the display location is level, firm, and setup-ready.");
    if (plan.service !== "Marquee letters only") flags.push("Décor, planning, and venue elements require custom pricing.");
    if (!flags.length) flags.push("No obvious setup flags yet—Heather can confirm the final plan.");
    return flags;
  }

  function completedCount() {
    const phrase = cleanPhrase(plan.phrase);
    return [
      Boolean(phrase && plan.service),
      Boolean(plan.eventType && plan.eventDate),
      Boolean(plan.location && plan.setting && plan.surface),
      Boolean(plan.power && plan.access && plan.installWindow),
    ].filter(Boolean).length;
  }

  function partyBrief() {
    const phrase = cleanPhrase(plan.phrase);
    const count = billableCount();
    const subtotal = count ? count * 50 + 125 : 0;
    return [
      "SHINE BRIGHT — PHRASE & PARTY BRIEF",
      "",
      `PHRASE: ${valueOr(phrase)}`,
      `BILLABLE LETTERS / NUMBERS: ${count || "Not set"}`,
      `SERVICE INTEREST: ${plan.service}`,
      `EVENT: ${valueOr(plan.eventType)}`,
      `DATE: ${valueOr(plan.eventDate)}`,
      `VENUE / NEIGHBORHOOD: ${valueOr(plan.location)}`,
      `SETTING: ${valueOr(plan.setting)}`,
      `SURFACE: ${valueOr(plan.surface)}`,
      `POWER: ${valueOr(plan.power)}`,
      `ACCESS: ${valueOr(plan.access)}`,
      `PREFERRED GLOW: ${plan.glow}`,
      `INSTALL WINDOW: ${valueOr(plan.installWindow)}`,
      `CONTACT NAME: ${valueOr(plan.contactName)}`,
      `NOTES: ${valueOr(plan.notes, "None provided")}`,
      "",
      subtotal
        ? `PUBLISHED BASE SUBTOTAL: $${subtotal} (${count} × $50 + $125 delivery/pickup)`
        : "PUBLISHED BASE SUBTOTAL: Add a phrase to calculate",
      "",
      "SETUP QUESTIONS",
      ...setupFlags().map((flag) => `• ${flag}`),
      "",
      "Please confirm inventory, availability, final placement, delivery area, add-ons, taxes, and the actual quote directly with Shine Bright Marquee.",
    ].join("\n");
  }

  function setList(id, items) {
    const list = byId(id);
    list.replaceChildren();
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
  }

  function renderMarquee() {
    const phrase = cleanPhrase(plan.phrase) || "YOUR PHRASE";
    const container = byId("marquee-phrase");
    container.replaceChildren();
    phrase.split(" ").forEach((word, wordIndex) => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "marquee-word";
      word.split("").forEach((character, characterIndex) => {
        const letter = document.createElement("b");
        letter.textContent = character;
        letter.dataset.char = character;
        letter.dataset.key = `${wordIndex}-${characterIndex}`;
        wordSpan.append(letter);
      });
      container.append(wordSpan);
    });
    const stage = byId("marquee-stage");
    glows.forEach((glow) => stage.classList.remove(glowClass(glow)));
    stage.classList.add(glowClass(plan.glow));
    stage.setAttribute("aria-label", `Marquee preview: ${phrase}`);
  }

  function render() {
    const phrase = cleanPhrase(plan.phrase);
    const count = billableCount();
    const subtotal = count ? count * 50 + 125 : 0;
    const completed = completedCount();
    const flags = setupFlags();

    renderMarquee();
    byId("piece-count").textContent = `${count} piece${count === 1 ? "" : "s"}`;
    byId("layout-note").textContent = count <= 5
      ? "A compact display that should read cleanly as one focal point."
      : count <= 9
        ? "A wider phrase—worth confirming the wall or floor run before setup."
        : "A long statement that may work best as two grouped lines or separate moments.";

    byId("progress").textContent = completed === 4 ? "Ready" : `${4 - completed} sections left`;
    byId("progress").classList.toggle("ready", completed === 4);
    byId("subtotal").textContent = subtotal ? `$${subtotal}` : "Add a phrase";
    byId("formula").textContent = count
      ? `${count} letters/numbers × $50 + $125 delivery/pickup`
      : "Uses Shine Bright’s published marquee pricing.";
    byId("brief-phrase").textContent = phrase || "—";
    byId("brief-service").textContent = plan.service;
    byId("brief-event").textContent = plan.eventType || "—";
    byId("brief-place").textContent = plan.location || "—";
    byId("brief-glow").textContent = plan.glow;
    byId("flag-count").textContent = `${flags.length} note${flags.length === 1 ? "" : "s"}`;
    setList("flag-list", flags);

    document.querySelectorAll("[data-field][data-value]").forEach((button) => {
      const active = plan[button.dataset.field] === button.dataset.value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-input]").forEach((input) => {
      const field = input.dataset.input;
      if (input.value !== plan[field]) input.value = plan[field];
    });

    const subject = `Marquee idea — ${phrase || "phrase TBD"}`;
    byId("email-brief").href = `mailto:hello@shinebrightmarquee.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(partyBrief())}`;
  }

  function update(field, value) {
    plan[field] = field === "phrase" ? cleanPhrase(value) : value;
    render();
  }

  function makeButton(field, value, className, description) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.field = field;
    button.dataset.value = value;
    button.setAttribute("aria-pressed", "false");
    if (className === "service") {
      const strong = document.createElement("strong");
      const small = document.createElement("small");
      strong.textContent = value;
      small.textContent = description;
      button.append(strong, small);
    } else if (className.includes("glow-")) {
      const light = document.createElement("i");
      const label = document.createElement("span");
      label.textContent = value;
      button.append(light, label);
    } else {
      button.textContent = value;
    }
    button.addEventListener("click", () => update(field, value));
    return button;
  }

  function buildOptions() {
    examples.forEach((example) => byId("example-row").append(makeButton("phrase", example, "")));
    services.forEach(([name, description]) => byId("service-grid").append(makeButton("service", name, "service", description)));
    ["Indoor", "Outdoor", "Not sure yet"].forEach((setting) => byId("setting-grid").append(makeButton("setting", setting, "choice")));
    glows.forEach((glow) => byId("glow-grid").append(makeButton("glow", glow, glowClass(glow))));
  }

  function flash(message) {
    const toast = byId("toast");
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2400);
  }

  async function copyBrief() {
    const brief = partyBrief();
    try {
      await navigator.clipboard.writeText(brief);
      flash("Party brief copied");
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
      flash(copied ? "Party brief copied" : "Copy unavailable — use the email button");
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

  function resetPlan() {
    Object.assign(plan, emptyPlan);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* continue */ }
    render();
    flash("Fresh party started");
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
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* continue */ }
    }
  }

  buildOptions();
  loadPlan();
  document.querySelectorAll("[data-input]").forEach((input) => {
    input.addEventListener("input", (event) => update(event.currentTarget.dataset.input, event.currentTarget.value));
  });
  byId("copy-brief").addEventListener("click", copyBrief);
  byId("save-plan").addEventListener("click", savePlan);
  byId("reset-plan").addEventListener("click", resetPlan);
  render();
})();
