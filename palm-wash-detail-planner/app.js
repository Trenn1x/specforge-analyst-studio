const vehicles = [
  { id: "coupe", label: "Coupe", detail: "2-door" },
  { id: "sedan", label: "Sedan", detail: "4-door" },
  { id: "suv", label: "SUV", detail: "2–3 rows" },
  { id: "truck", label: "Truck", detail: "Cab + bed" },
  { id: "van", label: "Passenger van", detail: "Multi-row" },
];
const packages = [
  { id: "sunrise", label: "Sunrise", eyebrow: "Maintenance refresh", description: "For vehicles kept on a more regular detailing rhythm." },
  { id: "ocean", label: "Ocean Breeze", eyebrow: "Deeper reset", description: "For heavier pollen, road grime, sand, or a longer gap between details." },
];
const prices = {
  sunrise: { coupe: 325, sedan: 375, suv: 425, truck: 475, van: 525 },
  ocean: { coupe: 450, sedan: 475, suv: 525, truck: 550, van: 575 },
};
const conditionOptions = ["Lowcountry pollen or sap", "Beach sand", "Pet hair", "Food or drink spills", "Odor concern", "No special concerns"];

const params = new URLSearchParams(window.location.search);
const state = {
  vehicle: vehicles.some((item) => item.id === params.get("vehicle")) ? params.get("vehicle") : "sedan",
  packageId: packages.some((item) => item.id === params.get("package")) ? params.get("package") : "sunrise",
  conditions: [],
  preference: "Weekday morning",
  location: "West Ashley",
};

const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const byId = (id) => document.getElementById(id);

function renderVehicles() {
  byId("vehicle-grid").innerHTML = vehicles.map((item) => `
    <button class="choice-card ${state.vehicle === item.id ? "selected" : ""}" data-vehicle="${item.id}" aria-pressed="${state.vehicle === item.id}">
      <span class="vehicle-glyph" aria-hidden="true">${item.id === "van" ? "▰" : item.id === "truck" ? "▱" : "▭"}</span>
      <strong>${item.label}</strong><small>${item.detail}</small>
    </button>`).join("");
  document.querySelectorAll("[data-vehicle]").forEach((button) => button.addEventListener("click", () => {
    state.vehicle = button.dataset.vehicle;
    render();
  }));
}

function renderPackages() {
  byId("package-grid").innerHTML = packages.map((item) => `
    <button class="package-card ${state.packageId === item.id ? "selected" : ""}" data-package="${item.id}" aria-pressed="${state.packageId === item.id}">
      <span class="radio-dot" aria-hidden="true"></span>
      <span><small>${item.eyebrow}</small><strong>${item.label}</strong><p>${item.description}</p></span>
      <b>${money(prices[item.id][state.vehicle])}+</b>
    </button>`).join("");
  document.querySelectorAll("[data-package]").forEach((button) => button.addEventListener("click", () => {
    state.packageId = button.dataset.package;
    render();
  }));
}

function renderConditions() {
  byId("condition-grid").innerHTML = conditionOptions.map((option) => `
    <button class="condition ${state.conditions.includes(option) ? "selected" : ""}" data-condition="${option}" aria-pressed="${state.conditions.includes(option)}">
      <span aria-hidden="true">${state.conditions.includes(option) ? "✓" : "+"}</span>${option}
    </button>`).join("");
  document.querySelectorAll("[data-condition]").forEach((button) => button.addEventListener("click", () => {
    const option = button.dataset.condition;
    if (option === "No special concerns") state.conditions = state.conditions.includes(option) ? [] : [option];
    else {
      state.conditions = state.conditions.filter((item) => item !== "No special concerns");
      state.conditions = state.conditions.includes(option) ? state.conditions.filter((item) => item !== option) : [...state.conditions, option];
    }
    render();
  }));
}

function getSummary() {
  const vehicle = vehicles.find((item) => item.id === state.vehicle);
  const detailPackage = packages.find((item) => item.id === state.packageId);
  return [
    "PALM WASH DETAIL PLAN",
    `Vehicle: ${vehicle.label}`,
    `Package: ${detailPackage.label}`,
    `Published starting price: ${money(prices[state.packageId][state.vehicle])}`,
    `Condition notes: ${state.conditions.length ? state.conditions.join(", ") : "None selected"}`,
    `Preferred timing: ${state.preference}`,
    `Service area: ${state.location}`,
    "",
    "Concept estimate only. Palm Wash confirms scope, availability, and final price.",
  ].join("\n");
}

function flash(message) {
  byId("status").textContent = message;
  window.setTimeout(() => { byId("status").textContent = ""; }, 2200);
}

function render() {
  renderVehicles(); renderPackages(); renderConditions();
  const vehicle = vehicles.find((item) => item.id === state.vehicle);
  const detailPackage = packages.find((item) => item.id === state.packageId);
  byId("estimate-price").textContent = money(prices[state.packageId][state.vehicle]);
  byId("estimate-note").textContent = `${detailPackage.label} · ${vehicle.label}`;
  byId("summary-care").textContent = detailPackage.eyebrow;
  byId("summary-flags").textContent = state.conditions.length || "None";
  byId("summary-preference").textContent = state.preference;
  byId("summary-location").textContent = state.location;
}

byId("preference").addEventListener("change", (event) => { state.preference = event.target.value; render(); });
byId("location").addEventListener("change", (event) => { state.location = event.target.value; render(); });
byId("copy-summary").addEventListener("click", async () => { await navigator.clipboard.writeText(getSummary()); flash("Plan copied"); });
byId("save-plan").addEventListener("click", () => { localStorage.setItem("palm-wash-plan", JSON.stringify(state)); flash("Saved on this device"); });
byId("share-plan").addEventListener("click", async () => {
  const url = new URL(window.location.href); url.search = "";
  url.searchParams.set("vehicle", state.vehicle); url.searchParams.set("package", state.packageId);
  await navigator.clipboard.writeText(url.toString()); flash("Share link copied");
});

render();
