const $ = (id) => document.getElementById(id);

const fields = [
  "eventType", "eventDate", "location", "guests", "setupWidth", "setupDepth", "surface",
  "accessNotes", "serviceHours", "retailer", "drinkNotes", "theme", "photoWall",
  "lightUpSign", "eventNotes", "contactName", "contactEmail"
];

const state = {
  approval: "Not confirmed",
  package: "Help me choose",
  beverages: [],
};

function value(id) {
  const element = $(id);
  return element.type === "checkbox" ? element.checked : element.value.trim();
}

function niceDate(raw) {
  if (!raw) return "Not set yet";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${raw}T12:00:00Z`));
}

function fitStatus() {
  const width = Number(value("setupWidth"));
  const depth = Number(value("setupDepth"));
  if (!width || !depth) return "Measure the clear setup area";
  if ((width >= 30 && depth >= 15) || (width >= 15 && depth >= 30)) return "Rough footprint looks worth reviewing with Ian";
  return "Published footprint is larger—ask Ian about options";
}

function openQuestions() {
  const questions = [];
  if (!value("eventDate")) questions.push("What date should Ian check?");
  if (!value("location")) questions.push("What venue or address should he review?");
  if (state.approval !== "Customer marked yes") questions.push("Does the venue allow an outside mobile bar and client-purchased alcohol?");
  if (!value("setupWidth") || !value("setupDepth")) questions.push("What clear setup area is available?");
  if (!value("surface")) questions.push("What surface will the trailer sit on?");
  if (!value("accessNotes")) questions.push("How would the trailer reach and leave the setup zone?");
  if (!state.beverages.length) questions.push("What do the guests actually like to drink?");
  if (Number(value("guests")) > 150) questions.push("What staffing or second-bar setup makes sense above 150 guests?");
  if (!value("contactName") || !value("contactEmail")) questions.push("Who should Ian follow up with?");
  return questions;
}

function readiness() {
  const parts = [
    value("eventDate"), value("location"), state.approval === "Customer marked yes",
    value("setupWidth") && value("setupDepth"), value("surface"),
    state.beverages.length > 0, value("contactName") && value("contactEmail")
  ];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
}

function makeBrief(questions) {
  const dimensions = value("setupWidth") && value("setupDepth") ? `${value("setupWidth")} × ${value("setupDepth")} ft` : "Not measured";
  const questionList = questions.length ? questions.map((question) => `- ${question}`).join("\n") : "- No obvious gaps in this first pass—Ian should still confirm the details.";
  return [
    "SOUTHERN POURS — EVENT CONVERSATION BRIEF",
    "Created with an independent concept planner. Nothing has been booked, quoted, or submitted.",
    "", "CONTACT",
    `Name: ${value("contactName") || "Not provided"}`,
    `Email: ${value("contactEmail") || "Not provided"}`,
    "", "EVENT",
    `Type: ${value("eventType")}`,
    `Date: ${niceDate(value("eventDate"))}`,
    `Venue / address: ${value("location") || "Not provided"}`,
    `Expected guests: ${value("guests")}`,
    `Desired service time: ${value("serviceHours") || "Not provided"} hours`,
    "", "VENUE + TRAILER FIT",
    `Outside mobile bar permission: ${state.approval}`,
    `Available clear area: ${dimensions}`,
    `Surface: ${value("surface") || "Not provided"}`,
    `Arrival / access notes: ${value("accessNotes") || "Not provided"}`,
    `Planner flag: ${fitStatus()}`,
    "", "POUR DIRECTION",
    `Package conversation starting point: ${state.package}`,
    `Guest preferences: ${state.beverages.length ? state.beverages.join(", ") : "Not provided"}`,
    `Preferred retailer: ${value("retailer") || "Not provided"}`,
    `Drink / cocktail notes: ${value("drinkNotes") || "None yet"}`,
    "", "LOOK + EXTRAS TO DISCUSS",
    `Theme / colors: ${value("theme") || "Not provided"}`,
    `Photo wall interest: ${value("photoWall") ? "Yes" : "No / unsure"}`,
    `Light-up sign interest: ${value("lightUpSign") ? "Yes" : "No / unsure"}`,
    `Other notes: ${value("eventNotes") || "None yet"}`,
    "", "QUESTIONS TO CONFIRM WITH IAN", questionList
  ].join("\n");
}

function render() {
  const guests = Number(value("guests"));
  const questions = openQuestions();
  const percent = readiness();
  const brief = makeBrief(questions);
  $("guestOutput").textContent = guests;
  $("progressPill").textContent = `${percent}% shaped`;
  $("percent").textContent = `${percent}%`;
  $("fitStatus").textContent = fitStatus();
  $("permissionStatus").textContent = state.approval === "Customer marked yes" ? "Marked confirmed by you" : state.approval === "Still checking" ? "Still being checked" : "Needs a venue question";
  $("permissionDot").className = state.approval === "Customer marked yes" ? "good" : "";
  $("guestStatus").textContent = guests > 150 ? "Ask about the large-event setup" : `${guests} guests as a starting point`;
  $("guestDot").className = guests > 150 ? "" : "good";
  $("questionCount").textContent = questions.length;
  $("firstQuestion").textContent = questions[0] || "This first pass is ready for a human review.";
  $("brief").textContent = brief;
  const subject = `Event plan question — ${value("eventType")}${value("eventDate") ? ` on ${niceDate(value("eventDate"))}` : ""}`;
  $("emailDraft").href = `mailto:SouthernPours@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${brief}\n\nCould you let me know what you would want us to confirm next?`)}`;
}

fields.forEach((id) => {
  $(id).addEventListener("input", render);
  $(id).addEventListener("change", render);
});

document.querySelectorAll("#approvalButtons button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#approvalButtons button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.approval = button.dataset.value;
    render();
  });
});

document.querySelectorAll("#packageOptions button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("#packageOptions button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.package = button.dataset.package;
    render();
  });
});

document.querySelectorAll("#beverageOptions button").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("selected");
    state.beverages = [...document.querySelectorAll("#beverageOptions button.selected")].map((item) => item.textContent.trim());
    render();
  });
});

$("copyBrief").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("brief").textContent);
  $("copyBrief").textContent = "Copied";
  $("actionNote").textContent = "Brief copied to your clipboard.";
  setTimeout(() => {
    $("copyBrief").textContent = "Copy clean brief";
    $("actionNote").textContent = "The email button opens a draft in your mail app. It does not send anything.";
  }, 2200);
});

render();
