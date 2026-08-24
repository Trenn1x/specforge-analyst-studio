const byId = function (id) { return document.getElementById(id); };

const itemOptions = [
  { id: "sofa", label: "Sofa / upholstered", group: "Furniture", note: "Sofas, chairs, sectionals", icon: "SO" },
  { id: "bed", label: "Bed / mattress", group: "Furniture", note: "Frames, mattresses, box springs", icon: "BD" },
  { id: "table", label: "Tables / chairs", group: "Furniture", note: "Dining, side, patio, seating", icon: "TB" },
  { id: "appliance", label: "Large appliance", group: "Appliances", note: "Fridge, washer, dryer, stove", icon: "AP" },
  { id: "electronics", label: "Electronics", group: "Electronics", note: "TVs, computers, related items", icon: "EL" },
  { id: "boxes", label: "Boxes / bags", group: "Household", note: "Packed, bagged, or loose clutter", icon: "BX" },
  { id: "yard", label: "Yard waste", group: "Yard", note: "Branches, leaves, clippings", icon: "YD" },
  { id: "wood", label: "Wood / drywall", group: "Construction", note: "Renovation or project debris", icon: "WD" },
  { id: "masonry", label: "Concrete / masonry", group: "Construction", note: "Heavy debris for review", icon: "CM" },
  { id: "office", label: "Office items", group: "Office", note: "Desks, chairs, filing cabinets", icon: "OF" },
  { id: "tools", label: "Garage / tools", group: "Household", note: "Tools, storage, mixed garage items", icon: "GR" },
  { id: "other", label: "Other bulky item", group: "Other", note: "Add the specifics below", icon: "+?" }
];

const state = {
  counts: {},
  setting: "",
  urgency: "Flexible timing",
  files: [],
  previewUrls: []
};

itemOptions.forEach(function (item) { state.counts[item.id] = 0; });

function value(id) {
  const element = byId(id);
  return element ? element.value.trim() : "";
}

function escapeHtml(raw) {
  return String(raw).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character];
  });
}

function selectedItems() {
  return itemOptions.filter(function (item) {
    return state.counts[item.id] > 0;
  }).map(function (item) {
    return {
      label: item.label,
      group: item.group,
      count: state.counts[item.id],
      id: item.id
    };
  });
}

function selectedValues(selector, attribute) {
  return Array.from(document.querySelectorAll(selector + ":checked")).map(function (input) {
    return input.dataset[attribute];
  });
}

function totalItems() {
  return selectedItems().reduce(function (sum, item) { return sum + item.count; }, 0);
}

function renderItems() {
  byId("item-grid").innerHTML = itemOptions.map(function (item) {
    const count = state.counts[item.id];
    const active = count > 0 ? " active" : "";
    return [
      '<article class="item-card' + active + '">',
      '<div class="item-info"><div><strong>' + item.label + '</strong><small>' + item.note + '</small></div><span class="item-icon" aria-hidden="true">' + item.icon + '</span></div>',
      '<div class="counter">',
      '<button type="button" data-action="minus" data-item="' + item.id + '" aria-label="Remove one ' + item.label + '">−</button>',
      '<output aria-label="' + item.label + ' quantity">' + count + '</output>',
      '<button type="button" data-action="plus" data-item="' + item.id + '" aria-label="Add one ' + item.label + '">+</button>',
      '</div></article>'
    ].join("");
  }).join("");
}

function setSegment(groupId, key, selectedValue) {
  document.querySelectorAll("#" + groupId + " button").forEach(function (button) {
    const selected = button.dataset[key] === selectedValue;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function conversationLane() {
  const items = selectedItems();
  const total = totalItems();
  const flags = selectedValues("[data-flag]", "flag");
  const hasDenseDebris = state.counts.wood + state.counts.masonry > 0;
  if (!total && !value("other-items")) return "No items yet";
  if (flags.length || hasDenseDebris || total >= 10 || items.length >= 5) return "Photos + scope review";
  if (total === 1 && items.length === 1 && !value("other-items")) return "Single-item conversation";
  if (items.length <= 3 && total <= 6) return "Small mixed pickup";
  return "Mixed-load conversation";
}

function suggestedPhotos() {
  const shots = ["One wide photo showing the whole pickup area", "One photo showing the path from the items toward parking"];
  const accesses = selectedValues("[data-access]", "access");
  if (accesses.some(function (item) { return item.indexOf("Stairs") >= 0 || item.indexOf("Elevator") >= 0; })) shots.push("Stairs, elevator, turns, or loading area");
  if (state.counts.appliance > 0 || state.counts.electronics > 0) shots.push("Front, side, label, cord, and connection area of appliances or electronics");
  if (state.counts.wood > 0 || state.counts.masonry > 0) shots.push("Debris pile with a familiar object nearby for visual scale");
  if (state.counts.yard > 0) shots.push("Yard pile plus gate and route out");
  if (state.counts.office > 0 || state.counts.tools > 0) shots.push("Room or garage overview plus the densest cluster");
  if (selectedValues("[data-flag]", "flag").length) shots.push("Close-up of anything flagged for human review");
  return shots.slice(0, 6);
}

function openQuestions() {
  const questions = [];
  if (!totalItems() && !value("other-items")) questions.push("What should the team expect to haul?");
  if (!value("service-area") && !value("location")) questions.push("Where is the pickup for service-area review?");
  if (!state.setting) questions.push("Where are the items now?");
  if (!selectedValues("[data-access]", "access").length && !value("access-notes")) questions.push("Is the route simple, or is there access worth seeing?");
  if (!state.files.length) questions.push("Can a few useful photos show the pile and route?");
  if (state.urgency !== "Flexible timing" && !value("preferred-date")) questions.push("What date should Mike review?");
  if (!value("contact-name") || !value("contact-email")) questions.push("Who should Mike follow up with?");
  if (selectedValues("[data-flag]", "flag").length && !value("handling-notes")) questions.push("What should the team know about the flagged item or material?");
  return questions;
}

function readiness() {
  const checks = [
    totalItems() > 0 || value("other-items"),
    value("service-area") || value("location"),
    state.setting,
    selectedValues("[data-access]", "access").length || value("access-notes"),
    value("contact-name") && value("contact-email"),
    state.urgency === "Flexible timing" || value("preferred-date")
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function niceDate(raw) {
  if (!raw) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(raw + "T12:00:00Z"));
}

function listOrFallback(list, fallback) {
  return list.length ? list.map(function (item) { return "- " + item; }).join("\n") : "- " + fallback;
}

function buildBrief() {
  const items = selectedItems();
  const itemLines = items.map(function (item) { return item.count + " × " + item.label; });
  if (value("other-items")) itemLines.push("Other / detail: " + value("other-items"));
  const access = selectedValues("[data-access]", "access");
  const flags = selectedValues("[data-flag]", "flag");
  const questions = openQuestions();
  const area = [value("service-area"), value("location")].filter(Boolean).join(" · ");
  return [
    "COASTAL JUNK SOLUTIONS — PICKUP CONVERSATION BRIEF",
    "Created with an independent planning concept. Nothing has been quoted, scheduled, submitted, or booked.",
    "",
    "CONTACT",
    "Name: " + (value("contact-name") || "Not provided"),
    "Email: " + (value("contact-email") || "Not provided"),
    "Phone: " + (value("contact-phone") || "Not provided"),
    "Best reply route: " + value("reply-route"),
    "",
    "PROJECT",
    "Type: " + value("project-type"),
    "Service area / address: " + (area || "Not provided"),
    "Conversation lane: " + conversationLane() + " (not a volume or price estimate)",
    "",
    "ITEMS",
    listOrFallback(itemLines, "No items listed yet"),
    "",
    "PLACE + ACCESS",
    "Current pickup spot: " + (state.setting || "Not selected"),
    listOrFallback(access, "No access details selected"),
    "Walk-through note: " + (value("access-notes") || "None yet"),
    "",
    "PHOTOS",
    "Photos selected locally: " + state.files.length,
    state.files.length ? "Reminder: manually attach these photos to the email; this planner cannot upload or attach them." : "No photos selected. Mike may want a wide load photo and an access-route photo.",
    "",
    "HUMAN-REVIEW FLAGS",
    listOrFallback(flags, "No special-review flags selected"),
    "Condition / handling detail: " + (value("handling-notes") || "None yet"),
    "",
    "TIMING",
    "Timing interest: " + state.urgency,
    "Preferred date: " + niceDate(value("preferred-date")),
    "Preferred window: " + value("preferred-window"),
    "",
    "OTHER NOTES",
    value("final-notes") || "None yet",
    "",
    "QUESTIONS TO CONFIRM WITH MIKE",
    listOrFallback(questions, "This first pass is organized; Mike should still confirm every service detail."),
    "",
    "BOUNDARY",
    "This brief does not identify accepted or restricted materials, assess safety, estimate volume or weight, set a price, promise donation or recycling, confirm service area, hold a date, dispatch a crew, collect payment, or book a pickup."
  ].join("\n");
}

function renderPhotos() {
  state.previewUrls.forEach(function (url) { URL.revokeObjectURL(url); });
  state.previewUrls = state.files.map(function (file) { return URL.createObjectURL(file); });
  byId("photo-count").textContent = state.files.length ? state.files.length + (state.files.length === 1 ? " photo selected" : " photos selected") : "No photos selected";
  byId("photo-previews").innerHTML = state.files.map(function (file, index) {
    return '<figure><img src="' + state.previewUrls[index] + '" alt="Local preview of selected pickup photo ' + (index + 1) + '"><figcaption>' + escapeHtml(file.name) + '</figcaption></figure>';
  }).join("");
}

function render() {
  const items = selectedItems();
  const total = totalItems();
  const percent = readiness();
  const questions = openQuestions();
  const brief = buildBrief();
  const lane = conversationLane();

  byId("item-total").textContent = total + (total === 1 ? " item" : " items");
  byId("summary-count").textContent = total;
  byId("profile").textContent = lane;
  byId("readiness").textContent = percent + "%";
  byId("load-track").style.width = percent + "%";
  byId("summary-title").textContent = total || value("other-items") ? "A clearer first pickup conversation." : "Start with the item list.";
  byId("question-count").textContent = questions.length;
  byId("first-question").textContent = questions[0] || "This first pass is ready for Mike’s review.";
  byId("brief-text").textContent = brief;
  byId("summary-items").innerHTML = items.length
    ? items.map(function (item) { return "<span>" + item.count + " × " + item.label + "</span>"; }).join("")
    : '<p class="empty">Tap + on any item to build the list.</p>';
  byId("photo-checklist").innerHTML = suggestedPhotos().map(function (shot) { return "<p>" + shot + "</p>"; }).join("");

  const subjectDetail = value("project-type") || "pickup";
  const subject = "Pickup brief question — " + subjectDetail;
  const photoLine = state.files.length ? "\n\nI’ll attach the selected photos separately." : "";
  const emailBody = brief + photoLine + "\n\nWhat would you want me to confirm next?";
  byId("email-brief").href = "mailto:mike@coastaljunksolutions.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(emailBody);
}

byId("item-grid").addEventListener("click", function (event) {
  const button = event.target.closest("button[data-item]");
  if (!button) return;
  const id = button.dataset.item;
  const next = state.counts[id] + (button.dataset.action === "plus" ? 1 : -1);
  state.counts[id] = Math.max(0, Math.min(99, next));
  renderItems();
  render();
});

document.querySelectorAll("#setting-options button").forEach(function (button) {
  button.addEventListener("click", function () {
    state.setting = button.dataset.setting;
    setSegment("setting-options", "setting", state.setting);
    render();
  });
});

document.querySelectorAll("#urgency-options button").forEach(function (button) {
  button.addEventListener("click", function () {
    state.urgency = button.dataset.urgency;
    setSegment("urgency-options", "urgency", state.urgency);
    render();
  });
});

document.querySelectorAll("input:not(#photo-input), select, textarea").forEach(function (element) {
  element.addEventListener("input", render);
  element.addEventListener("change", render);
});

byId("photo-input").addEventListener("change", function (event) {
  state.files = Array.from(event.target.files || []).slice(0, 6);
  renderPhotos();
  render();
});

byId("clear-photos").addEventListener("click", function () {
  state.files = [];
  byId("photo-input").value = "";
  renderPhotos();
  render();
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
  byId("action-note").textContent = "Pickup brief copied to your clipboard.";
  window.setTimeout(function () {
    byId("copy-brief").textContent = "Copy pickup brief";
    byId("action-note").textContent = "The email button opens a draft in your mail app. It does not send anything.";
  }, 2000);
}

byId("copy-brief").addEventListener("click", copyBrief);

byId("reset").addEventListener("click", function () {
  document.querySelectorAll("input:not([type=checkbox]), textarea").forEach(function (element) { element.value = ""; });
  document.querySelectorAll("input[type=checkbox]").forEach(function (element) { element.checked = false; });
  document.querySelectorAll("select").forEach(function (element) { element.selectedIndex = 0; });
  itemOptions.forEach(function (item) { state.counts[item.id] = 0; });
  state.setting = "";
  state.urgency = "Flexible timing";
  state.files = [];
  setSegment("setting-options", "setting", "");
  setSegment("urgency-options", "urgency", state.urgency);
  byId("photo-input").value = "";
  renderItems();
  renderPhotos();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

setSegment("urgency-options", "urgency", state.urgency);
renderItems();
renderPhotos();
render();
