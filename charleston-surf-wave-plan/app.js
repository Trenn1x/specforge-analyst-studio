const state = {
  activity: "Surf lesson",
  nextId: 4,
  participants: [1, 2, 3].map((id) => ({
    id,
    name: `Surfer ${id}`,
    ageBand: "Not added",
    experience: "First time",
    waterComfort: "Not sure yet",
    goal: "",
    notes: "",
  })),
};

const $ = (selector) => document.querySelector(selector);
const participantsRoot = $("#participants");

function lane() {
  const size = state.participants.length;
  if (state.activity === "Surf lesson") {
    if (size === 1) return "Private lesson conversation";
    if (size <= 5) return "Public lesson conversation";
    return "Group session conversation";
  }
  if (state.activity === "eFoil lesson") return "eFoil conversation";
  if (state.activity === "Surf camp question") return "Camp conversation";
  if (state.activity === "Personal training") return "Training conversation";
  return "Ask Shep which offering fits";
}

function displayDate() {
  const value = $("#date").value;
  if (!value) return "No date chosen";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function questions() {
  const result = [];
  if (!$("#date").value) result.push("What date or date window could work?");
  if ($("#location").value === "Flexible") result.push("Which location makes the most sense?");
  if (state.participants.some((person) => person.ageBand === "Not added")) result.push("What are the missing participant age bands?");
  if (state.participants.some((person) => person.waterComfort === "Not sure yet")) result.push("Which participants need a water-comfort conversation?");
  if (state.participants.some((person) => !person.goal.trim())) result.push("What would each person most like to get from the session?");
  if (!$("#contact-email").value.trim()) result.push("Where should Charleston Surf Company reply?");
  return result;
}

function buildBrief() {
  const people = state.participants.map((person, index) =>
    `${index + 1}. ${person.name || `Surfer ${index + 1}`} — ${person.ageBand}; ${person.experience}; water comfort: ${person.waterComfort}; goal: ${person.goal || "not added"}${person.notes ? `; note: ${person.notes}` : ""}`
  ).join("\n");
  const open = questions();
  const contactName = $("#contact-name").value.trim() || "Not added";
  const contactEmail = $("#contact-email").value.trim();

  return `CHARLESTON SURF SESSION BRIEF

Contact: ${contactName}${contactEmail ? ` (${contactEmail})` : ""}
Exploring: ${state.activity}
Conversation starting point: ${lane()}
Preferred location: ${$("#location").value}
Preferred date: ${displayDate()}
Date flexibility: ${$("#date-flex").value}
Group size: ${state.participants.length}

PARTICIPANTS
${people}

GROUP CONTEXT
${$("#group-note").value.trim() || "No additional group context added."}

OPEN QUESTIONS
${open.length ? open.map((item) => `• ${item}`).join("\n") : "• Basics are organized; Charleston Surf Company can still confirm the right next questions."}

PLEASE CONFIRM
The appropriate offering, participant fit, location, conditions, instructor/equipment plan, availability, pricing, waiver steps, and booking details.

PLANNER LIMITS
This independent planning concept does not assess swimming or ocean safety, medical fitness, live conditions, equipment needs, participant eligibility, availability, or price—and it does not create a booking.`;
}

function optionList(values, selected) {
  return values.map((value) => `<option${value === selected ? " selected" : ""}>${value}</option>`).join("");
}

function renderParticipants() {
  participantsRoot.replaceChildren();
  state.participants.forEach((person, index) => {
    const card = document.createElement("article");
    card.className = "participant-card";
    card.innerHTML = `
      <div class="participant-head"><span>${String(index + 1).padStart(2, "0")}</span><button type="button" data-remove ${state.participants.length === 1 ? "disabled" : ""}>Remove</button></div>
      <label><span>Name or nickname</span><input data-field="name" /></label>
      <div class="field-grid two compact">
        <label><span>Age band</span><select data-field="ageBand">${optionList(["Not added","Under 8","8–11","12–15","16–17","18+"], person.ageBand)}</select></label>
        <label><span>Surf experience</span><select data-field="experience">${optionList(["First time","A prior lesson or two","Comfortable beginner","Intermediate","Advanced"], person.experience)}</select></label>
      </div>
      <label><span>Self-reported water comfort</span><select data-field="waterComfort">${optionList(["Not sure yet","Needs a conversation","Generally comfortable","Strong swimmer"], person.waterComfort)}</select><small class="field-note">A note for discussion—not a safety or eligibility assessment.</small></label>
      <label><span>What would make this feel worthwhile?</span><input data-field="goal" placeholder="Stand up once, improve a turn, build confidence…" /></label>
      <label><span>Anything Shep should know?</span><textarea data-field="notes" rows="3" placeholder="Questions, accommodations, prior coaching…"></textarea></label>`;

    card.querySelector('[data-field="name"]').value = person.name;
    card.querySelector('[data-field="goal"]').value = person.goal;
    card.querySelector('[data-field="notes"]').value = person.notes;
    card.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener("input", () => {
        person[field.dataset.field] = field.value;
        update();
      });
    });
    card.querySelector("[data-remove]").addEventListener("click", () => {
      if (state.participants.length === 1) return;
      state.participants = state.participants.filter((item) => item.id !== person.id);
      renderParticipants();
      update();
    });
    participantsRoot.append(card);
  });
  $("#add-person").hidden = state.participants.length >= 12;
}

function renderPrep() {
  const items = [
    { done: Boolean($("#date").value), label: "A preferred date or useful window" },
    { done: state.participants.every((person) => person.ageBand !== "Not added"), label: "Age band for everyone" },
    { done: state.participants.every((person) => person.goal.trim()), label: "One honest goal per participant" },
    { done: false, label: "Let the business confirm safety, fit, conditions, gear, and price" },
  ];
  $("#prep-list").innerHTML = items.map((item, index) => `<li class="${item.done ? "done" : ""}"><span>${item.done ? "✓" : index + 1}</span>${item.label}</li>`).join("");
}

function update() {
  const size = state.participants.length;
  const countCopy = `${size} ${size === 1 ? "person" : "people"}`;
  const open = questions();
  $("#group-count").textContent = countCopy;
  $("#orbit-count").textContent = size;
  $("#lane").textContent = lane();
  $("#snap-activity").textContent = state.activity;
  $("#snap-location").textContent = $("#location").value;
  $("#snap-date").textContent = displayDate();
  $("#snap-group").textContent = countCopy;
  $("#question-title").textContent = open.length ? `${open.length} ${open.length === 1 ? "question" : "questions"} to tighten up` : "Ready for a human look";
  $("#question-copy").textContent = open[0] || "The basics are organized. Shep can confirm what matters next.";
  $("#open-count").textContent = `${open.length} open`;
  const brief = buildBrief();
  $("#brief-output").textContent = brief;
  $("#email-brief").href = `mailto:charlestonsurfco843@gmail.com?subject=${encodeURIComponent(`Surf session question — ${countCopy}`)}&body=${encodeURIComponent(brief)}`;
  renderPrep();
}

$("#activity-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-activity]");
  if (!button) return;
  state.activity = button.dataset.activity;
  document.querySelectorAll("[data-activity]").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  update();
});

$("#add-person").addEventListener("click", () => {
  if (state.participants.length >= 12) return;
  const index = state.participants.length + 1;
  state.participants.push({ id: state.nextId++, name: `Surfer ${index}`, ageBand: "Not added", experience: "First time", waterComfort: "Not sure yet", goal: "", notes: "" });
  renderParticipants();
  update();
});

["#location", "#date", "#date-flex", "#contact-name", "#contact-email", "#group-note"].forEach((selector) => {
  $(selector).addEventListener("input", update);
});

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

renderParticipants();
update();
