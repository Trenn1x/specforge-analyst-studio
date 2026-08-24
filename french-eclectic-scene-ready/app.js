const byId = function (id) { return document.getElementById(id); };

const state = {
  style: "Open to the team's ideas",
  zones: [],
  pieces: [],
  selectedZoneId: null,
  nextZoneId: 1,
  nextPieceId: 1
};

const zoneDefaults = {
  Ceremony: { width: 30, depth: 18, fallbackW: 52, fallbackH: 30, className: "zone-ceremony" },
  Lounge: { width: 18, depth: 16, fallbackW: 30, fallbackH: 28, className: "zone-lounge" },
  Bar: { width: 16, depth: 8, fallbackW: 28, fallbackH: 18, className: "zone-bar" },
  Dining: { width: 30, depth: 22, fallbackW: 48, fallbackH: 38, className: "zone-dining" },
  Welcome: { width: 10, depth: 8, fallbackW: 22, fallbackH: 17, className: "zone-welcome" },
  Greenroom: { width: 16, depth: 14, fallbackW: 29, fallbackH: 26, className: "zone-greenroom" },
  VIP: { width: 20, depth: 16, fallbackW: 34, fallbackH: 29, className: "zone-vip" },
  Activation: { width: 16, depth: 14, fallbackW: 29, fallbackH: 26, className: "zone-activation" }
};

function value(id) {
  const element = byId(id);
  return element ? element.value.trim() : "";
}

function selected(selector, key) {
  return Array.from(document.querySelectorAll(selector + ":checked")).map(function (input) {
    return input.dataset[key];
  });
}

function numberValue(id) {
  const raw = value(id);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveWhole(id) {
  const parsed = numberValue(id);
  return Number.isInteger(parsed) && parsed > 0;
}

function positiveNumber(id) {
  const parsed = numberValue(id);
  return parsed !== null && parsed > 0;
}

function todayValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return today.getFullYear() + "-" + month + "-" + day;
}

function isPastDate(raw) {
  return Boolean(raw && raw < todayValue());
}

function niceDate(raw) {
  if (!raw) return "Still open";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(raw + "T12:00:00Z"));
}

function niceTime(raw) {
  if (!raw) return "Not set";
  const parts = raw.split(":");
  const date = new Date();
  date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function minutes(raw) {
  if (!raw) return null;
  const parts = raw.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function validTimeline() {
  const setup = minutes(value("setup-time"));
  const guest = minutes(value("guest-time"));
  const strike = minutes(value("strike-time"));
  if (setup !== null && guest !== null && setup >= guest) return false;
  if (setup !== null && strike !== null && setup >= strike) return false;
  if (guest !== null && strike !== null && guest >= strike) return false;
  return true;
}

function validEmail() {
  const input = byId("contact-email");
  return Boolean(value("contact-email") && input.checkValidity());
}

function validProductUrl(raw) {
  if (!raw) return true;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "thefrencheclectic.com" || url.hostname === "www.thefrencheclectic.com");
  } catch (error) {
    return false;
  }
}

function currentZone() {
  return state.zones.find(function (zone) { return zone.id === state.selectedZoneId; }) || null;
}

function uniqueZoneLabel(type) {
  const count = state.zones.filter(function (zone) { return zone.type === type; }).length + 1;
  return count === 1 ? type : type + " " + count;
}

function clamp(number, minimum, maximum) {
  return Math.min(Math.max(number, minimum), maximum);
}

function zoneRect(zone) {
  const defaults = zoneDefaults[zone.type];
  const spaceWidth = numberValue("space-width");
  const spaceDepth = numberValue("space-depth");
  const rawW = spaceWidth && zone.width ? zone.width / spaceWidth * 100 : defaults.fallbackW;
  const rawH = spaceDepth && zone.depth ? zone.depth / spaceDepth * 100 : defaults.fallbackH;
  return {
    x: zone.x,
    y: zone.y,
    w: clamp(rawW, 12, 100),
    h: clamp(rawH, 12, 100),
    rawW: rawW,
    rawH: rawH
  };
}

function moveZone(zone, dx, dy) {
  const rect = zoneRect(zone);
  zone.x = clamp(zone.x + dx, 0, Math.max(0, 100 - rect.w));
  zone.y = clamp(zone.y + dy, 0, Math.max(0, 100 - rect.h));
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function layoutWarnings() {
  const warnings = [];
  const width = numberValue("space-width");
  const depth = numberValue("space-depth");
  state.zones.forEach(function (zone) {
    const rect = zoneRect(zone);
    if (width && rect.rawW > 100) warnings.push(zone.label + " is wider than the rough usable width.");
    if (depth && rect.rawH > 100) warnings.push(zone.label + " is deeper than the rough usable depth.");
    if (rect.x + rect.w > 100.01 || rect.y + rect.h > 100.01) warnings.push(zone.label + " reaches beyond the rough canvas.");
  });
  for (let i = 0; i < state.zones.length; i += 1) {
    for (let j = i + 1; j < state.zones.length; j += 1) {
      if (overlaps(zoneRect(state.zones[i]), zoneRect(state.zones[j]))) {
        warnings.push(state.zones[i].label + " overlaps " + state.zones[j].label + " on the rough canvas.");
      }
    }
  }
  return warnings;
}

function addZone(type) {
  const defaults = zoneDefaults[type];
  const index = state.zones.length;
  const zone = {
    id: state.nextZoneId,
    type: type,
    label: uniqueZoneLabel(type),
    width: defaults.width,
    depth: defaults.depth,
    capacity: "",
    priority: "Flexible",
    note: "",
    x: 5 + index * 11 % 58,
    y: 6 + index * 13 % 55
  };
  state.nextZoneId += 1;
  state.zones.push(zone);
  state.selectedZoneId = zone.id;
  moveZone(zone, 0, 0);
  render();
}

function removeSelectedZone() {
  const zoneId = state.selectedZoneId;
  state.zones = state.zones.filter(function (zone) { return zone.id !== zoneId; });
  state.pieces.forEach(function (piece) { if (piece.zoneId === zoneId) piece.zoneId = null; });
  state.selectedZoneId = state.zones.length ? state.zones[state.zones.length - 1].id : null;
  render();
  const focusTarget = state.selectedZoneId
    ? document.querySelector('[data-zone-id="' + state.selectedZoneId + '"]')
    : document.querySelector("#zone-buttons button");
  if (focusTarget) focusTarget.focus();
}

function renderStyleButtons() {
  document.querySelectorAll("#style-options button").forEach(function (button) {
    const active = button.dataset.style === state.style;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderCanvas() {
  const canvas = byId("zone-canvas");
  canvas.replaceChildren();
  const selectedId = state.selectedZoneId;
  state.zones.forEach(function (zone) {
    const rect = zoneRect(zone);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zone-card " + zoneDefaults[zone.type].className + (zone.id === selectedId ? " selected" : "");
    button.style.left = rect.x + "%";
    button.style.top = rect.y + "%";
    button.style.width = rect.w + "%";
    button.style.height = rect.h + "%";
    button.dataset.zoneId = String(zone.id);
    button.setAttribute("aria-label", zone.label + ", roughly " + zone.width + " by " + zone.depth + " feet. Select and use arrow keys to move.");
    const name = document.createElement("strong");
    name.textContent = zone.label;
    const detail = document.createElement("small");
    detail.textContent = zone.width + " × " + zone.depth + " ft · " + zone.priority;
    button.append(name, detail);
    button.addEventListener("click", function () {
      state.selectedZoneId = zone.id;
      render();
      const selectedButton = document.querySelector('[data-zone-id="' + zone.id + '"]');
      if (selectedButton) selectedButton.focus();
    });
    button.addEventListener("keydown", function (event) {
      const amount = event.shiftKey ? 5 : 2;
      const deltas = { ArrowUp: [0, -amount], ArrowDown: [0, amount], ArrowLeft: [-amount, 0], ArrowRight: [amount, 0] };
      if (!deltas[event.key]) return;
      event.preventDefault();
      moveZone(zone, deltas[event.key][0], deltas[event.key][1]);
      render();
      const moved = document.querySelector('[data-zone-id="' + zone.id + '"]');
      if (moved) moved.focus();
    });
    button.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      state.selectedZoneId = zone.id;
      const startX = event.clientX;
      const startY = event.clientY;
      const startZoneX = zone.x;
      const startZoneY = zone.y;
      const canvasBounds = canvas.getBoundingClientRect();
      button.setPointerCapture(event.pointerId);
      function onMove(moveEvent) {
        const rectNow = zoneRect(zone);
        const dx = (moveEvent.clientX - startX) / canvasBounds.width * 100;
        const dy = (moveEvent.clientY - startY) / canvasBounds.height * 100;
        zone.x = clamp(startZoneX + dx, 0, Math.max(0, 100 - rectNow.w));
        zone.y = clamp(startZoneY + dy, 0, Math.max(0, 100 - rectNow.h));
        button.style.left = zone.x + "%";
        button.style.top = zone.y + "%";
      }
      function onUp() {
        button.removeEventListener("pointermove", onMove);
        button.removeEventListener("pointerup", onUp);
        button.removeEventListener("pointercancel", onUp);
        render();
      }
      button.addEventListener("pointermove", onMove);
      button.addEventListener("pointerup", onUp);
      button.addEventListener("pointercancel", onUp);
    });
    canvas.appendChild(button);
  });

  byId("canvas-title").textContent = state.zones.length ? state.zones.length + (state.zones.length === 1 ? " scene on the rough map" : " scenes on the rough map") : "Add a zone to start the map";
  byId("canvas-scale").textContent = positiveNumber("space-width") && positiveNumber("space-depth")
    ? numberValue("space-width") + " × " + numberValue("space-depth") + " ft rough space"
    : "Dimensions still open";
  const warnings = layoutWarnings();
  byId("canvas-warning").textContent = warnings.length ? warnings[0] + (warnings.length > 1 ? " + " + (warnings.length - 1) + " more to review." : "") : "No layout warnings yet.";
  byId("canvas-warning").classList.toggle("alert", warnings.length > 0);
}

function renderInspector() {
  const inspector = byId("zone-inspector");
  const zone = currentZone();
  inspector.hidden = !zone;
  if (!zone) return;
  byId("zone-name").textContent = zone.label;
  byId("zone-width").value = zone.width;
  byId("zone-depth").value = zone.depth;
  byId("zone-capacity").value = zone.capacity;
  byId("zone-priority").value = zone.priority;
  byId("zone-note").value = zone.note;
}

function renderPieceZoneOptions() {
  const select = byId("piece-zone");
  const previous = select.value;
  select.replaceChildren();
  const undecided = document.createElement("option");
  undecided.value = "";
  undecided.textContent = "Undecided";
  select.appendChild(undecided);
  state.zones.forEach(function (zone) {
    const option = document.createElement("option");
    option.value = String(zone.id);
    option.textContent = zone.label;
    select.appendChild(option);
  });
  if (Array.from(select.options).some(function (option) { return option.value === previous; })) select.value = previous;
}

function pieceZoneLabel(piece) {
  const zone = state.zones.find(function (item) { return item.id === piece.zoneId; });
  return zone ? zone.label : "Undecided";
}

function renderPieces() {
  const list = byId("piece-list");
  list.replaceChildren();
  state.pieces.forEach(function (piece) {
    const row = document.createElement("div");
    row.className = "piece-row";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = piece.quantity + " × " + piece.name;
    const details = document.createElement("p");
    details.textContent = "Intended scene: " + pieceZoneLabel(piece) + (piece.url ? " · Official link saved in the brief" : " · No product link added");
    copy.append(title, details);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove " + piece.name);
    remove.addEventListener("click", function () {
      state.pieces = state.pieces.filter(function (item) { return item.id !== piece.id; });
      render();
    });
    row.append(copy, remove);
    list.appendChild(row);
  });
}

function addPiece() {
  const name = value("piece-name");
  const quantity = Number(value("piece-quantity"));
  const url = value("piece-url");
  if (!name) {
    byId("piece-message").textContent = "Add the official item name first.";
    byId("piece-name").focus();
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    byId("piece-message").textContent = "Use a positive whole-number requested quantity.";
    byId("piece-quantity").focus();
    return;
  }
  if (!validProductUrl(url)) {
    byId("piece-message").textContent = "Use an official thefrencheclectic.com product link or leave the URL blank.";
    byId("piece-url").focus();
    return;
  }
  if (state.pieces.length >= 10) {
    byId("piece-message").textContent = "This MVP keeps the brief to ten requested-piece lines. Combine similar pieces in one line if needed.";
    return;
  }
  state.pieces.push({
    id: state.nextPieceId,
    name: name,
    quantity: quantity,
    zoneId: value("piece-zone") ? Number(value("piece-zone")) : null,
    url: url
  });
  state.nextPieceId += 1;
  byId("piece-name").value = "";
  byId("piece-quantity").value = "1";
  byId("piece-url").value = "";
  byId("piece-message").textContent = "Requested piece added to the conversation brief. Nothing is reserved or submitted.";
  render();
}

function accessItems() {
  return selected("[data-access]", "access");
}

function openQuestions() {
  const questions = [];
  if (!value("event-type")) questions.push("What kind of event is this?");
  if (!positiveWhole("guest-count")) questions.push("What positive whole-number guest count should the team review?");
  if (!value("event-date")) questions.push("What preferred date should the team check?");
  else if (isPastDate(value("event-date"))) questions.push("What future preferred date should the team check?");
  if (isPastDate(value("alternate-date"))) questions.push("What future alternate date should the team check?");
  if (!value("venue") || !value("city")) questions.push("Which venue or property should the team review?");
  if (!value("setting")) questions.push("Is the event indoors, outdoors, tented, or mixed?");
  if (!state.zones.length) questions.push("Which event scene should the rough map include first?");
  if (!positiveNumber("space-width") || !positiveNumber("space-depth")) questions.push("What rough usable-space dimensions are known?");
  if (!state.pieces.length) questions.push("Which wishlist or official rental pieces belong in the brief?");
  if (!value("first-impression")) questions.push("What should guests notice first?");
  if (!accessItems().length && !value("access-notes")) questions.push("What should the team know about the load-in route or venue rules?");
  if (!value("setup-time") || !value("strike-time")) questions.push("What setup and strike windows has the venue provided?");
  if (!validTimeline()) questions.push("Do the setup, guest-arrival, or strike times need another look?");
  if (!value("contact-name") || !value("contact-email")) questions.push("Who should The French Eclectic follow up with?");
  else if (!validEmail()) questions.push("What valid email should the team use for follow-up?");
  if (!value("final-question")) questions.push("What is the planner’s most important open question?");
  const warnings = layoutWarnings();
  if (warnings.length) questions.push("Which rough overlap or size warning should the team review first?");
  return questions;
}

function readiness() {
  const checks = [
    value("event-type"),
    positiveWhole("guest-count"),
    value("event-date") && !isPastDate(value("event-date")) && !isPastDate(value("alternate-date")),
    value("venue") && value("city"),
    value("setting"),
    state.zones.length > 0,
    positiveNumber("space-width") && positiveNumber("space-depth"),
    state.pieces.length > 0,
    accessItems().length || value("access-notes"),
    value("contact-name") && validEmail(),
    value("final-question"),
    validTimeline()
  ];
  const percent = Math.round(checks.filter(Boolean).length / checks.length * 100);
  return openQuestions().length ? Math.min(percent, 95) : percent;
}

function canOpenEmail() {
  return Boolean(
    value("event-type") &&
    positiveWhole("guest-count") &&
    value("event-date") &&
    !isPastDate(value("event-date")) &&
    !isPastDate(value("alternate-date")) &&
    value("venue") &&
    value("city") &&
    state.zones.length &&
    value("contact-name") &&
    validEmail() &&
    validTimeline()
  );
}

function defaultActionNote() {
  return canOpenEmail()
    ? "Copy transfers the full brief to your clipboard. Email transfers a compact draft to your mail app. Neither action sends anything."
    : "Add a future date, positive guest count, venue/city, at least one zone, name, valid email, and workable time order before opening a draft. Copy remains available.";
}

function listBlock(items, fallback) {
  return items.length ? items.map(function (item) { return "- " + item; }).join("\n") : "- " + fallback;
}

function buildBrief() {
  const zones = state.zones.map(function (zone) {
    return zone.label + " | " + zone.width + " × " + zone.depth + " ft | " + (zone.capacity ? zone.capacity + " desired capacity" : "capacity open") + " | " + zone.priority + " | " + (zone.note || "No purpose note yet");
  });
  const pieces = state.pieces.map(function (piece) {
    return piece.quantity + " × " + piece.name + " | intended scene: " + pieceZoneLabel(piece) + (piece.url ? " | " + piece.url : "");
  });
  const warnings = layoutWarnings();
  const questions = openQuestions();
  return [
    "THE FRENCH ECLECTIC — SCENE + LOAD-IN CONVERSATION BRIEF",
    "Created with an independent planning concept. Nothing has been submitted, priced, reserved, scheduled, paid, or booked.",
    "",
    "CONTACT",
    "Name: " + (value("contact-name") || "Not provided"),
    "Email: " + (value("contact-email") || "Not provided"),
    "Phone: " + (value("contact-phone") || "Not provided"),
    "Best reply route: " + value("reply-route"),
    "",
    "EVENT FRAME",
    "Event lane: " + (value("event-type") || "Not chosen"),
    "Expected guests: " + (value("guest-count") || "Not provided"),
    "Preferred date: " + niceDate(value("event-date")),
    "Alternate date: " + niceDate(value("alternate-date")),
    "Venue / property: " + (value("venue") || "Not provided"),
    "City: " + (value("city") || "Not provided"),
    "Setting: " + (value("setting") || "Not chosen"),
    "Public collection starting point: " + state.style,
    "Desired first impression: " + (value("first-impression") || "Not provided"),
    "",
    "ROUGH SPACE + SCENES",
    "Usable-space note: " + (positiveNumber("space-width") && positiveNumber("space-depth") ? numberValue("space-width") + " × " + numberValue("space-depth") + " ft, host/planner reported" : "Dimensions not provided"),
    listBlock(zones, "No event zones added"),
    "",
    "ROUGH LAYOUT WARNINGS",
    listBlock(warnings, "No rough overlap or out-of-bounds warning surfaced"),
    "These are prompts only; the canvas does not check fit, capacity, accessibility, egress, code, or safety.",
    "",
    "REQUESTED RENTAL PIECES",
    listBlock(pieces, "No wishlist or official rental pieces added"),
    "",
    "LOAD-IN + VENUE",
    listBlock(accessItems(), "No load-in or venue-rule flags selected"),
    "Setup access begins: " + niceTime(value("setup-time")),
    "Guest arrival: " + niceTime(value("guest-time")),
    "Strike / pickup can begin: " + niceTime(value("strike-time")),
    "Venue contact: " + (value("venue-contact") || "Not provided"),
    "Access / rule note: " + (value("access-notes") || "None yet"),
    "",
    "MOST IMPORTANT QUESTION",
    value("final-question") || "Not provided",
    "",
    "QUESTIONS TO CONFIRM WITH THE FRENCH ECLECTIC",
    listBlock(questions, "The first pass is organized; the team should still confirm every rental and logistics detail."),
    "",
    "BOUNDARY",
    "This brief does not read live inventory, reserve anything, hold a date, calculate price or labor, guarantee fit or capacity, check accessibility or code, approve a venue or load-in route, confirm delivery or installation, upload photos, collect payment, submit itself, or book an event."
  ].join("\n");
}

function clipped(raw, limit) {
  if (!raw) return "Not provided";
  return raw.length > limit ? raw.slice(0, limit - 1).trim() + "…" : raw;
}

function buildEmailDraft(compact) {
  const zoneNames = state.zones.map(function (zone) { return zone.label; });
  const pieceNames = state.pieces.map(function (piece) { return piece.quantity + " × " + piece.name; });
  const lines = [
    "Hi Theresa, Katie, and Whitney,",
    "",
    "I used the Scene Ready concept to organize an event-flow and rental inquiry.",
    "",
    "Event: " + (value("event-type") || "Not chosen"),
    "Expected guests: " + (value("guest-count") || "Not provided"),
    "Preferred date: " + niceDate(value("event-date")),
    "Venue / city: " + clipped(value("venue"), 100) + " — " + clipped(value("city"), 60),
    "Setting / style: " + (value("setting") || "Not chosen") + " — " + state.style,
    "Scenes: " + (zoneNames.length ? zoneNames.join(", ") : "None added"),
    "Requested pieces: " + (pieceNames.length ? clipped(pieceNames.join("; "), 300) : "None added"),
    "Load-in flags: " + (accessItems().length ? clipped(accessItems().join("; "), 260) : "None selected"),
    "Host / planner: " + clipped(value("contact-name"), 70) + " — " + clipped(value("contact-email"), 120),
    "Main question: " + clipped(value("final-question"), 180)
  ];
  if (!compact) lines.push("Access note: " + clipped(value("access-notes"), 180));
  lines.push("", "What would you want us to confirm next?");
  return lines.join("\n");
}

function buildMinimalEmailDraft() {
  return [
    "Hi Theresa, Katie, and Whitney,",
    "",
    "I used the Scene Ready concept to organize an event-flow and rental inquiry.",
    "",
    "Event: " + (value("event-type") || "Not chosen"),
    "Preferred date: " + niceDate(value("event-date")),
    "Venue / city: " + clipped(value("venue"), 70) + " — " + clipped(value("city"), 40),
    "Expected guests: " + (value("guest-count") || "Not provided"),
    "Scenes added: " + state.zones.length,
    "Requested-piece lines: " + state.pieces.length,
    "Host / planner: " + clipped(value("contact-name"), 60) + " — " + clipped(value("contact-email"), 90),
    "Main question: " + clipped(value("final-question"), 120),
    "",
    "I can paste the full planning brief if useful. What would you want us to confirm next?"
  ].join("\n");
}

function renderTags(targetId, items, fallback) {
  const target = byId(targetId);
  target.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = fallback;
    target.appendChild(empty);
    return;
  }
  items.forEach(function (item) {
    const tag = document.createElement("span");
    tag.textContent = item;
    target.appendChild(tag);
  });
}

function renderSummary() {
  const guestText = positiveWhole("guest-count") ? " · " + numberValue("guest-count") + " guests" : "";
  byId("summary-title").textContent = (value("event-type") || "Event scene still open") + guestText;
  byId("summary-event").textContent = value("event-type") || "Not chosen";
  byId("summary-date").textContent = niceDate(value("event-date"));
  byId("summary-venue").textContent = value("venue") || "Not provided";
  byId("summary-style").textContent = state.style === "Open to the team's ideas" ? "Open to ideas" : state.style;
  byId("summary-zone-count").textContent = state.zones.length + (state.zones.length === 1 ? " zone" : " zones");
  byId("summary-piece-count").textContent = state.pieces.length;
  renderTags("summary-zones", state.zones.map(function (zone) { return zone.label; }), "No scenes mapped");
  renderTags("summary-pieces", state.pieces.map(function (piece) { return piece.quantity + " × " + piece.name; }), "No pieces added");
  const questions = openQuestions();
  byId("question-count").textContent = questions.length;
  byId("first-question").textContent = questions[0] || "The first pass is ready for the team’s review.";
  byId("readiness").textContent = readiness() + "%";
  byId("brief-text").textContent = buildBrief();

  const subject = "Event-flow brief — " + (value("event-type") || "rental inquiry") + (value("event-date") ? " on " + niceDate(value("event-date")) : "");
  let body = buildEmailDraft(false);
  let mailto = "mailto:bonjour@thefrencheclectic.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  if (mailto.length > 1850) {
    body = buildEmailDraft(true);
    mailto = "mailto:bonjour@thefrencheclectic.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  if (mailto.length > 1850) {
    body = buildMinimalEmailDraft();
    mailto = "mailto:bonjour@thefrencheclectic.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  byId("email-brief").href = canOpenEmail() ? mailto : "#load-in";
  byId("email-brief").setAttribute("aria-disabled", canOpenEmail() ? "false" : "true");
  byId("action-note").textContent = defaultActionNote();
}

function render() {
  renderStyleButtons();
  renderCanvas();
  renderInspector();
  renderPieceZoneOptions();
  renderPieces();
  renderSummary();
}

document.querySelectorAll("#style-options button").forEach(function (button) {
  button.addEventListener("click", function () {
    state.style = button.dataset.style;
    render();
  });
});

document.querySelectorAll("#zone-buttons button").forEach(function (button) {
  button.addEventListener("click", function () { addZone(button.dataset.zone); });
});

document.querySelectorAll("input, select, textarea").forEach(function (element) {
  if (["zone-width", "zone-depth", "zone-capacity", "zone-priority", "zone-note", "piece-name", "piece-quantity", "piece-zone", "piece-url"].indexOf(element.id) >= 0) return;
  element.addEventListener("input", render);
  element.addEventListener("change", render);
});

function updateSelectedZone() {
  const zone = currentZone();
  if (!zone) return;
  const width = Number(value("zone-width"));
  const depth = Number(value("zone-depth"));
  const capacity = value("zone-capacity");
  zone.width = Number.isFinite(width) && width > 0 ? width : zoneDefaults[zone.type].width;
  zone.depth = Number.isFinite(depth) && depth > 0 ? depth : zoneDefaults[zone.type].depth;
  zone.capacity = capacity && Number.isInteger(Number(capacity)) && Number(capacity) > 0 ? String(Number(capacity)) : "";
  zone.priority = value("zone-priority");
  zone.note = value("zone-note");
  moveZone(zone, 0, 0);
  renderCanvas();
  renderPieceZoneOptions();
  renderSummary();
}

["zone-width", "zone-depth", "zone-capacity", "zone-priority", "zone-note"].forEach(function (id) {
  byId(id).addEventListener("input", updateSelectedZone);
  byId(id).addEventListener("change", updateSelectedZone);
});

document.querySelectorAll("[data-nudge]").forEach(function (button) {
  button.addEventListener("click", function () {
    const zone = currentZone();
    if (!zone) return;
    const deltas = { up: [0, -3], down: [0, 3], left: [-3, 0], right: [3, 0] };
    moveZone(zone, deltas[button.dataset.nudge][0], deltas[button.dataset.nudge][1]);
    render();
  });
});

byId("remove-zone").addEventListener("click", removeSelectedZone);
byId("add-piece").addEventListener("click", addPiece);

async function copyBrief() {
  const text = byId("brief-text").textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  byId("copy-brief").textContent = "Copied ✓";
  byId("action-note").textContent = "Full brief copied to your clipboard.";
  window.setTimeout(function () {
    byId("copy-brief").textContent = "Copy full brief";
    byId("action-note").textContent = defaultActionNote();
  }, 2000);
}

byId("copy-brief").addEventListener("click", copyBrief);
byId("email-brief").addEventListener("click", function (event) {
  if (!canOpenEmail()) {
    event.preventDefault();
    byId("action-note").textContent = defaultActionNote();
  }
});

byId("reset").addEventListener("click", function () {
  document.querySelectorAll("input:not([type=checkbox]), textarea").forEach(function (element) { element.value = ""; });
  document.querySelectorAll("input[type=checkbox]").forEach(function (element) { element.checked = false; });
  document.querySelectorAll("select").forEach(function (element) { element.selectedIndex = 0; });
  byId("piece-quantity").value = "1";
  state.style = "Open to the team's ideas";
  state.zones = [];
  state.pieces = [];
  state.selectedZoneId = null;
  state.nextZoneId = 1;
  state.nextPieceId = 1;
  byId("piece-message").textContent = "Nothing is reserved or submitted here.";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

["event-date", "alternate-date"].forEach(function (id) { byId(id).min = todayValue(); });
render();
