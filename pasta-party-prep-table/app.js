const byId = function (id) { return document.getElementById(id); };

const state = {
  party: "I Dough bachelorette party",
  vibe: "Cozy dinner party"
};

const kitchenLabels = [
  "Large island, countertop, or workspace",
  "Working sink",
  "Working stovetop",
  "Serving dishes and silverware"
];

function value(id) {
  const element = byId(id);
  return element ? element.value.trim() : "";
}

function selected(selector, key) {
  return Array.from(document.querySelectorAll(selector + ":checked")).map(function (input) {
    return input.dataset[key];
  });
}

function shortParty() {
  if (state.party.indexOf("I Dough") === 0) return "I Dough";
  if (state.party.indexOf("Noodle Night") === 0) return "Noodle Night";
  if (state.party.indexOf("Carb Collab") === 0) return "Carb Collab";
  return "Custom celebration";
}

function niceDate(raw) {
  if (!raw) return "Still open";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(raw + "T12:00:00Z"));
}

function niceTime(raw) {
  if (!raw) return "Not set";
  const parts = raw.split(":");
  const date = new Date();
  date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function kitchenStatuses() {
  return Array.from(document.querySelectorAll("[data-kitchen]")).map(function (control) {
    return { label: control.dataset.kitchen, status: control.value };
  });
}

function kitchenAnswers() {
  return kitchenStatuses().filter(function (item) { return item.status; });
}

function kitchenSummaryItems() {
  return kitchenAnswers().map(function (item) { return shortKitchenLabel(item.label) + ": " + item.status; });
}

function accessItems() {
  return selected("[data-access]", "access");
}

function addOns() {
  return selected("[data-addon]", "addon");
}

function guestFlags() {
  return selected("[data-guest]", "guest");
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

function validHeadcount() {
  const count = Number(value("headcount"));
  return Number.isInteger(count) && count > 0;
}

function validEmail() {
  const email = byId("contact-email");
  return Boolean(value("contact-email") && email.checkValidity());
}

function minutes(raw) {
  if (!raw) return null;
  const parts = raw.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function validTimeline() {
  const access = minutes(value("access-time"));
  const start = minutes(value("start-time"));
  const departure = minutes(value("departure-time"));
  if (access !== null && departure !== null && access >= departure) return false;
  if (access !== null && start !== null && access >= start) return false;
  if (start !== null && departure !== null && departure <= start) return false;
  return true;
}

function canOpenEmail() {
  return Boolean(
    validHeadcount() &&
    value("party-date") &&
    !isPastDate(value("party-date")) &&
    !isPastDate(value("alternate-date")) &&
    value("setting") &&
    value("location") &&
    value("contact-name") &&
    validEmail() &&
    validTimeline()
  );
}

function defaultActionNote() {
  return canOpenEmail()
    ? "Copy sends the full brief to your clipboard. Email opens a compact draft in your mail app. Neither action sends the message."
    : "Add a future date, positive headcount, setting/location, name, valid email, and workable time order before opening a draft. Copy remains available.";
}

function shortKitchenLabel(label) {
  if (label.indexOf("island") >= 0) return "Work surface";
  if (label.indexOf("sink") >= 0) return "Sink";
  if (label.indexOf("stovetop") >= 0) return "Stovetop";
  return "Serveware";
}

function headcountNote() {
  const count = Number(value("headcount"));
  if (!validHeadcount()) return "Enter a positive whole-number headcount for the conversation.";
  if (count <= 12) return "A group of " + count + " is within the published 12-person standard cap to discuss.";
  return "A group of " + count + " is above the published standard cap—Pasta Party CHS asks larger or corporate groups to reach out so the team can see what might work.";
}

function openQuestions() {
  const questions = [];
  const kitchen = kitchenStatuses();
  const count = Number(value("headcount"));
  if (!validHeadcount()) questions.push("What positive whole-number headcount should the team review?");
  if (!value("party-date")) questions.push("What date should Pasta Party CHS check?");
  else if (isPastDate(value("party-date"))) questions.push("What future preferred date should the team check?");
  if (isPastDate(value("alternate-date"))) questions.push("What future alternate date should the team check?");
  if (!value("setting") || !value("location")) questions.push("Where will the Pasta Party happen?");
  if (validHeadcount() && count > 12) questions.push("Can Pasta Party CHS accommodate this larger group and format?");
  const unanswered = kitchen.filter(function (item) { return !item.status; }).map(function (item) { return item.label; });
  const unavailable = kitchen.filter(function (item) { return item.status === "Not available"; }).map(function (item) { return item.label; });
  const propertyChecks = kitchen.filter(function (item) { return item.status === "Need to ask property"; }).map(function (item) { return item.label; });
  if (unanswered.length) {
    const missing = kitchenLabels.filter(function (item) { return unanswered.indexOf(item) >= 0; });
    questions.push("What should the virtual visit confirm about: " + missing.join(", ") + "?");
  }
  if (unavailable.length) questions.push("Could the team work around what the host says is unavailable: " + unavailable.join(", ") + "?");
  if (propertyChecks.length) questions.push("Who can confirm these property questions: " + propertyChecks.join(", ") + "?");
  if (!value("workspace-type")) questions.push("What kind of work surface is available?");
  if (!accessItems().length && !value("kitchen-notes")) questions.push("Is there anything to know about setup access or property rules?");
  if (addOns().length) questions.push("What would the selected add-ons cost and add to the timing?");
  if (guestFlags().length && !value("guest-notes")) questions.push("What should the team know about the flagged guest needs?");
  if (!value("contact-name") || !value("contact-email")) questions.push("Who should Pasta Party CHS follow up with?");
  else if (!validEmail()) questions.push("What valid email should the team use for follow-up?");
  if (!validTimeline()) questions.push("Do the property-access, guest-start, or departure times need another look?");
  if (!value("final-question")) questions.push("What is the host’s biggest open question?");
  return questions;
}

function readiness() {
  const checks = [
    state.party,
    value("party-date") && !isPastDate(value("party-date")) && !isPastDate(value("alternate-date")),
    value("setting") && value("location"),
    validHeadcount(),
    kitchenAnswers().length === 4,
    value("workspace-type"),
    value("contact-name") && validEmail(),
    value("final-question") || value("occasion"),
    validTimeline()
  ];
  const percent = Math.round(checks.filter(Boolean).length / checks.length * 100);
  return openQuestions().length ? Math.min(percent, 95) : percent;
}

function listBlock(items, fallback) {
  return items.length ? items.map(function (item) { return "- " + item; }).join("\n") : "- " + fallback;
}

function buildBrief() {
  const kitchen = kitchenStatuses().map(function (item) {
    return item.label + ": " + (item.status || "Not answered");
  });
  const access = accessItems();
  const addons = addOns();
  const flags = guestFlags();
  const questions = openQuestions();
  return [
    "PASTA PARTY CHS — HOST + KITCHEN CONVERSATION BRIEF",
    "Created with an independent planning concept. Nothing has been submitted, priced, scheduled, paid, or booked.",
    "",
    "HOST",
    "Name: " + (value("contact-name") || "Not provided"),
    "Email: " + (value("contact-email") || "Not provided"),
    "Phone: " + (value("contact-phone") || "Not provided"),
    "Best reply route: " + value("reply-route"),
    "",
    "PARTY",
    "Closest public lane: " + state.party,
    "Expected partiers: " + value("headcount"),
    "Group note: " + headcountNote(),
    "Preferred date: " + niceDate(value("party-date")),
    "Alternate date: " + niceDate(value("alternate-date")),
    "Preferred guest start: " + niceTime(value("start-time")),
    "Setting: " + (value("setting") || "Not chosen"),
    "Location / property: " + (value("location") || "Not provided"),
    "Occasion / theme: " + (value("occasion") || "Not provided"),
    "Vibe: " + state.vibe,
    "",
    "KITCHEN — HOST REPORTED",
    listBlock(kitchen, "No public kitchen basics answered yet"),
    "Workspace description: " + (value("workspace-type") || "Not answered"),
    "Dishwasher: " + (value("dishwasher") || "Not answered"),
    "Virtual-visit / kitchen note: " + (value("kitchen-notes") || "None yet"),
    "",
    "SETUP + PROPERTY",
    listBlock(access, "No access or property details selected"),
    "Property access begins: " + niceTime(value("access-time")),
    "Hard departure time: " + niceTime(value("departure-time")),
    "",
    "A LA CARTE INTERESTS",
    listBlock(addons, "No add-on interests selected"),
    "",
    "GUEST QUESTIONS",
    listBlock(flags, "No guest flags selected"),
    "Dietary / accessibility / drink note: " + (value("guest-notes") || "None yet"),
    "Theme / add-on direction: " + (value("theme-notes") || "None yet"),
    "",
    "HOST’S FINAL QUESTION",
    value("final-question") || "Not provided",
    "",
    "QUESTIONS TO CONFIRM WITH PASTA PARTY CHS",
    listBlock(questions, "This first pass is organized; Pasta Party CHS should still confirm every party detail."),
    "",
    "BOUNDARY",
    "This brief does not approve a kitchen or venue, assess food or allergy safety, set a menu, confirm staffing, calculate add-on or party pricing, accept a deposit, apply the cancellation policy, hold a date, confirm availability, submit itself, or book a party."
  ].join("\n");
}

function clipped(raw, limit) {
  if (!raw) return "Not provided";
  return raw.length > limit ? raw.slice(0, limit - 1).trim() + "…" : raw;
}

function buildEmailDraft(ultraCompact) {
  const kitchen = kitchenSummaryItems();
  const extras = addOns().concat(guestFlags());
  const lines = [
    "Hi Blair,",
    "",
    "I used the Prep Table concept to organize a Pasta Party inquiry.",
    "",
    "Party: " + state.party,
    "Expected partiers: " + value("headcount"),
    "Preferred date: " + niceDate(value("party-date")),
    "Alternate date: " + niceDate(value("alternate-date")),
    "Setting / location: " + (value("setting") || "Not chosen") + " — " + clipped(value("location"), 140),
    "Kitchen basics: " + (kitchen.length ? kitchen.join("; ") : "Not answered yet"),
    "Workspace: " + (value("workspace-type") || "Not answered"),
    "Add-ons / guest flags: " + (extras.length ? extras.join("; ") : "None selected"),
    "Preferred guest start: " + niceTime(value("start-time")),
    "Host: " + (value("contact-name") || "Not provided") + " — " + (value("contact-email") || "No email provided") + (value("contact-phone") ? " — " + value("contact-phone") : ""),
    "Main question: " + clipped(value("final-question"), 220)
  ];
  if (!ultraCompact) {
    lines.push(
      "Occasion / theme: " + clipped(value("occasion"), 180),
      "Kitchen / access note: " + clipped(value("kitchen-notes"), 180),
      "Guest note: " + clipped(value("guest-notes"), 180)
    );
  }
  lines.push("", "What would you want us to confirm next?");
  return lines.join("\n");
}

function buildMinimalEmailDraft() {
  return [
    "Hi Blair,",
    "",
    "I used the Prep Table concept to organize a Pasta Party inquiry.",
    "",
    "Party: " + state.party,
    "Expected partiers: " + value("headcount"),
    "Preferred date: " + niceDate(value("party-date")),
    "Setting / location: " + (value("setting") || "Not chosen") + " — " + clipped(value("location"), 80),
    "Kitchen basics answered: " + kitchenAnswers().length + " of 4",
    "Host: " + clipped(value("contact-name"), 60) + " — " + clipped(value("contact-email"), 100),
    "Main question: " + clipped(value("final-question"), 140),
    "",
    "I can paste the full host brief from the planner if useful. What would you want us to confirm next?"
  ].join("\n");
}

function renderKitchenBoard() {
  const kitchen = kitchenStatuses();
  const count = kitchen.filter(function (item) { return item.status; }).length;
  byId("kitchen-score").textContent = count + " / 4 answered";
  byId("kitchen-track").style.width = count * 25 + "%";
  byId("kitchen-title").textContent = count === 4 ? "Four basics answered for review" : count ? count + " basics answered" : "Nothing answered yet";
  kitchen.forEach(function (item) {
    const control = document.querySelector('[data-kitchen="' + item.label + '"]');
    control.closest("label").dataset.status = item.status || "Not answered";
  });
  byId("board-stations").innerHTML = kitchen.map(function (item) {
    const className = item.status === "Available" ? "ready" : item.status === "Not available" ? "no" : item.status === "Need to ask property" ? "ask" : "";
    return '<span class="' + className + '">' + shortKitchenLabel(item.label) + " · " + (item.status || "Not answered") + "</span>";
  }).join("");
}

function renderTags(targetId, items, fallback) {
  byId(targetId).innerHTML = items.length
    ? items.map(function (item) { return "<span>" + item + "</span>"; }).join("")
    : '<span class="empty">' + fallback + "</span>";
}

function render() {
  const count = Number(value("headcount"));
  const kitchen = kitchenAnswers();
  const extras = addOns().concat(guestFlags());
  const questions = openQuestions();
  const percent = readiness();
  const brief = buildBrief();

  byId("headcount-output").textContent = validHeadcount() ? count : "—";
  byId("headcount-note").textContent = headcountNote();
  byId("summary-title").textContent = shortParty() + (validHeadcount() ? " for " + count : " · headcount open");
  byId("summary-party").textContent = shortParty();
  byId("summary-date").textContent = niceDate(value("party-date"));
  byId("summary-setting").textContent = value("setting") || "Not chosen";
  byId("summary-start").textContent = niceTime(value("start-time"));
  byId("summary-kitchen-count").textContent = kitchen.length + " / 4 answered";
  byId("readiness").textContent = percent + "%";
  byId("question-count").textContent = questions.length;
  byId("first-question").textContent = questions[0] || "The first pass is ready for the Pasta Party CHS team’s review.";
  byId("brief-text").textContent = brief;
  renderKitchenBoard();
  renderTags("summary-kitchen", kitchenSummaryItems(), "Kitchen basics not answered");
  renderTags("summary-extras", extras, "No add-ons or guest flags yet");

  const start = value("start-time");
  byId("timeline-note").textContent = start
    ? "Preferred guest start: " + niceTime(start) + ". Pasta Party CHS still confirms the team’s setup arrival and full departure window."
    : "Add a preferred guest start, then the team can work backward to the actual setup arrival.";

  const subject = "Pasta Party host brief — " + shortParty() + (value("party-date") ? " on " + niceDate(value("party-date")) : "");
  let body = buildEmailDraft(false);
  let mailto = "mailto:blair@pastapartychs.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  if (mailto.length > 1850) {
    body = buildEmailDraft(true);
    mailto = "mailto:blair@pastapartychs.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  if (mailto.length > 1850) {
    body = buildMinimalEmailDraft();
    mailto = "mailto:blair@pastapartychs.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  byId("email-brief").href = canOpenEmail() ? mailto : "#timing";
  byId("email-brief").setAttribute("aria-disabled", canOpenEmail() ? "false" : "true");
  byId("action-note").textContent = defaultActionNote();
}

function selectButton(groupId, dataKey, button) {
  document.querySelectorAll("#" + groupId + " button").forEach(function (item) {
    const active = item === button;
    item.classList.toggle("selected", active);
    item.setAttribute("aria-pressed", active ? "true" : "false");
  });
  state[dataKey] = button.dataset[dataKey];
  render();
}

document.querySelectorAll("#party-options button").forEach(function (button) {
  button.addEventListener("click", function () { selectButton("party-options", "party", button); });
});

document.querySelectorAll("#vibe-options button").forEach(function (button) {
  button.addEventListener("click", function () { selectButton("vibe-options", "vibe", button); });
});

document.querySelectorAll("input, select, textarea").forEach(function (element) {
  element.addEventListener("input", render);
  element.addEventListener("change", render);
});

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
  byId("action-note").textContent = "Host brief copied to your clipboard.";
  window.setTimeout(function () {
    byId("copy-brief").textContent = "Copy host brief";
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
  document.querySelectorAll("input:not([type=checkbox]):not([type=range]), textarea").forEach(function (element) { element.value = ""; });
  document.querySelectorAll("input[type=checkbox]").forEach(function (element) { element.checked = false; });
  document.querySelectorAll("select").forEach(function (element) { element.selectedIndex = 0; });
  byId("headcount").value = "8";
  state.party = "I Dough bachelorette party";
  state.vibe = "Cozy dinner party";
  document.querySelectorAll("#party-options button").forEach(function (button, index) {
    button.classList.toggle("selected", index === 0);
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
  });
  document.querySelectorAll("#vibe-options button").forEach(function (button, index) {
    button.classList.toggle("selected", index === 0);
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
  });
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelectorAll("#party-options button, #vibe-options button").forEach(function (button) {
  button.setAttribute("aria-pressed", button.classList.contains("selected") ? "true" : "false");
});

["party-date", "alternate-date"].forEach(function (id) {
  byId(id).min = todayValue();
});

render();
