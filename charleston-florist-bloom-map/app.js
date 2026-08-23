const $ = (id) => document.getElementById(id);
const palettePresets = [
  { name: "Lowcountry garden", colors: ["#6f7c68", "#e4c7bc", "#f3ead9", "#703f52"] },
  { name: "Citrus dusk", colors: ["#d26d4f", "#e7b067", "#f4e6d1", "#516653"] },
  { name: "Plum & linen", colors: ["#503448", "#9a7182", "#d8bdaf", "#f4eee4"] }
];
const definitions = [
  ["bridal","Personal flowers","Statement bouquet","The lead personal piece"], ["attendants","Personal flowers","Attendant bouquets","One rough count is enough"], ["boutonnieres","Personal flowers","Boutonnieres & corsages","Include family or wedding party"], ["other-personal","Personal flowers","Other personal flowers","Flower child, hair, keepsake, etc."],
  ["altar","Ceremony","Arch / altar moment","Freestanding or venue structure"], ["aisle","Ceremony","Aisle accents","Markers, meadow, or entry"], ["welcome","Ceremony","Welcome & signage","A floral touch near arrival"], ["ceremony-extra","Ceremony","Other ceremony area","Memorial, entry, or custom moment"],
  ["bar","Cocktail","Bar flowers","Front, back bar, or focal arrangement"], ["cocktail-tables","Cocktail","Cocktail tables","Small moments across the space"], ["seating","Cocktail","Escort / seating display","Floral layer around the display"],
  ["centerpieces","Reception","Guest table centerpieces","Enter the rough table count"], ["sweetheart","Reception","Sweetheart / head table","A more focused table moment"], ["cake","Reception","Cake flowers","Loose flowers or table accent"], ["reception-bar","Reception","Reception bar","If separate from cocktail hour"], ["statement","Reception","Statement installation","Entry, fireplace, ceiling, stage, etc."]
].map(([id, category, label, hint]) => ({ id, category, label, hint }));
const categories = ["Personal flowers", "Ceremony", "Cocktail", "Reception"];
const photoLabels = ["Ceremony area from the guest view","Reception room or floor plan","Entrances, stairs, elevators, and loading area","Inspiration images with notes on what you like","Attire or fabric swatches, if helpful"];
let selectedPalette = 0;
let zones = makeZones();

function makeZones() {
  return Object.fromEntries(definitions.map(({id}) => [id, { included:["bridal","altar","centerpieces"].includes(id), count:1, priority:"Explore", repurpose:"Not sure yet" }]));
}
function value(id) { return $(id).value.trim(); }
function formatDate(date) { return date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "Still open"; }
function activeZones() { return definitions.filter(({id}) => zones[id].included); }

function renderPalettes() {
  $("palette-list").innerHTML = palettePresets.map((preset, index) => `<button class="palette-option ${selectedPalette===index?"active":""}" data-palette="${index}" type="button"><span class="swatches">${preset.colors.map(c=>`<i style="background:${c}"></i>`).join("")}</span><span>${preset.name}</span></button>`).join("");
  document.querySelectorAll("[data-palette]").forEach(button => button.addEventListener("click", () => { selectedPalette = Number(button.dataset.palette); renderPalettes(); update(); }));
}
function renderZones() {
  $("zone-groups").innerHTML = categories.map(category => {
    const items = definitions.filter(item => item.category === category);
    const selected = items.filter(item => zones[item.id].included).length;
    return `<div class="zone-group"><div class="zone-group-head"><h3>${category}</h3><span>${selected} selected</span></div><div class="zone-list">${items.map(item => {
      const z = zones[item.id];
      return `<article class="zone-row ${z.included?"included":""}"><label class="zone-toggle"><input data-zone="${item.id}" data-field="included" type="checkbox" ${z.included?"checked":""}><span class="box"></span><span><strong>${item.label}</strong><small>${item.hint}</small></span></label><div class="zone-controls"><label><span>Rough count</span><input data-zone="${item.id}" data-field="count" type="number" min="1" max="999" value="${z.count}" ${z.included?"":"disabled"}></label><label><span>Priority</span><select data-zone="${item.id}" data-field="priority" ${z.included?"":"disabled"}>${["Must-have","Nice-to-have","Explore"].map(v=>`<option ${z.priority===v?"selected":""}>${v}</option>`).join("")}</select></label><label><span>Repurpose</span><select data-zone="${item.id}" data-field="repurpose" ${z.included?"":"disabled"}>${["Not sure yet","Keep in place","Move to cocktail","Move to reception","Take home"].map(v=>`<option ${z.repurpose===v?"selected":""}>${v}</option>`).join("")}</select></label></div></article>`;
    }).join("")}</div></div>`;
  }).join("");
  document.querySelectorAll("[data-zone]").forEach(control => control.addEventListener("change", () => {
    const { zone, field } = control.dataset;
    zones[zone][field] = field === "included" ? control.checked : field === "count" ? Math.max(1, Number(control.value)) : control.value;
    renderZones(); update();
  }));
}
function renderPhotos() {
  $("photo-list").innerHTML = photoLabels.map((label,i)=>`<label><input type="checkbox" data-photo="${i}"><span>${label}</span></label>`).join("");
  document.querySelectorAll("[data-photo]").forEach(box=>box.addEventListener("change",update));
}
function questions() {
  const result=[];
  if(!value("date")) result.push("Is the date available for a wedding consultation?");
  if(!value("venue")) result.push("Which venue details would be useful before the consultation?");
  if(!value("access")||!value("setup")) result.push("What delivery and setup information should we confirm with the venue?");
  if(activeZones().some(({id})=>zones[id].repurpose==="Not sure yet")) result.push("Which ceremony pieces might be practical to repurpose?");
  if(value("budget")==="Still deciding") result.push("How should we prioritize the design once budget comfort is discussed?");
  return result;
}
function buildBrief() {
  const lines = ["BLOOM MAP — WEDDING FLORAL CONSULTATION BRIEF","",`Couple / project: ${value("couple")||"Still open"}`,`Email: ${value("email")||"Still open"}`,`Wedding date: ${formatDate(value("date"))}`,`Venue: ${value("venue")||"Still open"}`,`Guest count: ${value("guests")||"Still open"}`,`Planner / day-of contact: ${value("planner")||"Still open"}`,"","DESIGN DIRECTION",`Palette: ${palettePresets[selectedPalette].name} (${palettePresets[selectedPalette].colors.join(", ")})`,`Style: ${value("style")}`,`Budget approach: ${value("budget")}`,`Flowers / details we love: ${value("love")||"Still open"}`,`Anything to avoid: ${value("avoid")||"Nothing noted"}`,"","FLORAL SPACES"];
  categories.forEach(category => { const selected=activeZones().filter(z=>z.category===category); if(selected.length){ lines.push(`${category}:`); selected.forEach(item=>{const z=zones[item.id];lines.push(`- ${item.label}: rough count ${z.count}; ${z.priority.toLowerCase()}; repurpose: ${z.repurpose.toLowerCase()}`);}); } });
  const checked=[...document.querySelectorAll("[data-photo]:checked")].map(box=>photoLabels[Number(box.dataset.photo)]);
  lines.push("","VENUE & DAY-OF NOTES",`Access / loading: ${value("access")||"Still open"}`,`Setup window: ${value("setup")||"Still open"}`,`Breakdown: ${value("breakdown")}`,`Repurposing notes: ${value("repurpose-notes")||"Still open"}`,`Other logistics: ${value("logistics-notes")||"Nothing noted"}`,"","PHOTOS / REFERENCES READY",...(checked.length?checked.map(x=>`- ${x}`):["- None marked ready yet"]),"","QUESTIONS TO CONFIRM",...questions().map(x=>`- ${x}`));
  if(value("open-notes")) lines.push(`- ${value("open-notes")}`);
  lines.push("","Planning note: This brief is a conversation starter. It does not confirm flower availability or seasonality, exact stems or quantities, pricing, the wedding date, venue approval, installation feasibility, consultation scheduling, payment, or an order.");
  return lines.join("\n");
}
function update() {
  const active=activeZones();
  $("zone-total").textContent=active.length; $("brief-total").textContent=active.length;
  $("brief-couple").textContent=value("couple")||"Your names here"; $("brief-date").textContent=formatDate(value("date")); $("brief-venue").textContent=value("venue")||"Still open"; $("brief-guests").textContent=value("guests")||"Still open"; $("brief-style").textContent=value("style");
  $("brief-colors").innerHTML=palettePresets[selectedPalette].colors.map(c=>`<i style="background:${c}"></i>`).join("");
  $("brief-categories").innerHTML=categories.map(category=>{const count=active.filter(z=>z.category===category).length;return count?`<p><span>${category}</span><b>${count}</b></p>`:"";}).join("");
  $("question-list").innerHTML=questions().slice(0,3).map(q=>`<li>${q}</li>`).join("");
  $("copy-side").querySelector("b").textContent=`${active.length} areas ↗`;
  const completion=[value("couple")&&value("date")&&value("venue"),value("style"),active.length>0,value("access")||value("setup")||value("logistics-notes")].filter(Boolean).length;
  $("progress-count").textContent=`${completion}/4`; $("progress-bar").style.width=`${completion*25}%`;
  $("email-link").href=`mailto:charlestonfloristwed@gmail.com?subject=${encodeURIComponent(`Wedding floral consultation brief${value("couple")?` — ${value("couple")}`:""}`)}&body=${encodeURIComponent(buildBrief())}`;
}
async function copyBrief(button) { await navigator.clipboard.writeText(buildBrief()); const previous=button.querySelector("span")?button.querySelector("span").textContent:button.textContent; if(button.querySelector("span"))button.querySelector("span").textContent="Brief copied ✓";else button.textContent="Copied to clipboard ✓"; setTimeout(()=>{if(button.querySelector("span"))button.querySelector("span").textContent=previous;else button.textContent=previous;},1600); }
document.querySelectorAll("input,textarea,select").forEach(control=>{if(!control.dataset.zone&&!control.dataset.photo)control.addEventListener("input",update);});
$("copy").addEventListener("click",()=>copyBrief($("copy"))); $("copy-side").addEventListener("click",()=>copyBrief($("copy-side")));
$("reset").addEventListener("click",()=>{document.querySelectorAll("input:not([type=checkbox]),textarea").forEach(x=>x.value=""); document.querySelectorAll("select").forEach(x=>x.selectedIndex=0); selectedPalette=0; zones=makeZones(); document.querySelectorAll("[data-photo]").forEach(x=>x.checked=false); renderPalettes(); renderZones(); update(); window.scrollTo({top:0,behavior:"smooth"});});
renderPalettes(); renderZones(); renderPhotos(); update();
