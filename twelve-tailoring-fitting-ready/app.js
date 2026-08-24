const $ = id => document.getElementById(id);
const garments = [
  { id:"bridal", mark:"B", label:"Bridal gown", note:"Fitting, bustle, structure, or preservation", bring:["Wedding-day shoes","Planned undergarments / shapewear","Headpiece or veil, if relevant","Jewelry or accessories that affect the look","A trusted person, if you want one there","Garment bag"] },
  { id:"formal", mark:"F", label:"Formal gown", note:"Gala, prom, guest, or special occasion", bring:["Shoes you plan to wear","Planned undergarments","Accessories that affect length or neckline","Garment bag"] },
  { id:"suit", mark:"S", label:"Suit / tuxedo", note:"Jacket, trousers, shirt, or full look", bring:["Dress shirt","Tie or bow tie, if planned","Shoes you plan to wear","Belt or suspenders, if planned","All suit pieces"] },
  { id:"everyday", mark:"E", label:"Everyday garment", note:"Dress, pants, skirt, jacket, or shirt", bring:["Shoes that affect the length","Undergarments you normally wear with it","Any matching separates","A clean, ready-to-handle garment"] },
  { id:"party", mark:"P", label:"Wedding party", note:"Several coordinated garments or fittings", bring:["Every garment in the group","Shoes and planned underlayers","Names and contact details for participants","Event timeline or planner contact","Garment bags"] },
  { id:"uniform", mark:"U", label:"Uniform / corporate", note:"Hemming, resizing, patches, or volume work", bring:["Representative garment or full batch list","Placement guidance for patches or labels","Wearer roster and size notes, if available","Deadline and handoff contact"] }
];
const concerns = [
  ["length","Length / hem","Dragging, break, or uneven length"], ["bodice","Waist / bodice","Gapping, pulling, or shaping"], ["shoulders","Shoulders / sleeves","Length, mobility, or jacket balance"], ["neckline","Neckline / lapels","Placement, shape, or coverage"], ["bustle","Train / bustle","Event-day handling to discuss"], ["repair","Repair / prior work","Damage or another alteration to review"], ["comfort","Comfort / movement","Sitting, walking, dancing, or reach"], ["multiple","Multiple pieces","Coordinated separates or garments"], ["unsure","Not sure yet","Let the fitting surface the options"]
];
let garment = "bridal";

function value(id){return $(id).value.trim()}
function selectedConcerns(){return [...document.querySelectorAll("[data-concern]:checked")].map(x=>concerns.find(c=>c[0]===x.dataset.concern)[1])}
function checkedBring(){return [...document.querySelectorAll("[data-bring]:checked")].map(x=>x.dataset.bring)}
function checkedConditions(){return [...document.querySelectorAll("[data-condition]:checked")].map(x=>x.dataset.condition)}
function garmentData(){return garments.find(x=>x.id===garment)}
function formatDate(v){return v?new Date(`${v}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Still open"}
function timing(){
  const event=value("event-date");
  if(!event)return {lane:"Date needed",copy:"The event date helps the shop understand urgency and whether a rush-service conversation may be needed."};
  const days=Math.ceil((new Date(`${event}T12:00:00`)-new Date())/86400000);
  if(days<0)return {lane:"Date has passed",copy:"Double-check the event date before sending the brief."};
  if(days<14)return {lane:"Time-sensitive conversation",copy:"The date is close. Ask the shop what is realistic and whether any rush option is available—nothing is confirmed here."};
  if(garment==="bridal"&&days<56)return {lane:"Timing needs a human look",copy:"Bridal work can involve several fittings. Let the shop decide what the garment and remaining time allow."};
  return {lane:"Useful lead time to discuss",copy:"There appears to be room for a normal planning conversation, but workload, construction, and fittings still control the actual schedule."};
}
function renderGarments(){
  $("garment-cards").innerHTML=garments.map(x=>`<button class="garment-card ${x.id===garment?"active":""}" data-garment="${x.id}" type="button"><i>${x.mark}</i><strong>${x.label}</strong><small>${x.note}</small></button>`).join("");
  document.querySelectorAll("[data-garment]").forEach(b=>b.addEventListener("click",()=>{garment=b.dataset.garment;renderGarments();renderBring();update()}));
}
function renderConcerns(){
  $("concern-grid").innerHTML=concerns.map((x,i)=>`<label class="concern"><input data-concern="${x[0]}" type="checkbox" ${i<2?"checked":""}><span><strong>${x[1]}</strong><small>${x[2]}</small></span></label>`).join("");
  document.querySelectorAll("[data-concern]").forEach(x=>x.addEventListener("change",update));
}
function renderBring(){
  $("bring-list").innerHTML=garmentData().bring.map((x,i)=>`<label><input data-bring="${x}" type="checkbox" ${i===0?"checked":""}><span>${x}</span></label>`).join("");
  document.querySelectorAll("[data-bring]").forEach(x=>x.addEventListener("change",update));
}
function buildBrief(){
  const concernsList=selectedConcerns(), bring=checkedBring(), conditions=checkedConditions(), t=timing();
  const milestones=[["Preferred first fitting","first-fitting"],["Possible return fitting","return-fitting"],["Ideal pickup","pickup"],["Event / wear date","event-date"]];
  return [
    "FITTING READY — GARMENT & APPOINTMENT BRIEF","",
    `Client / project: ${value("client")||"Still open"}`,`Email: ${value("email")||"Still open"}`,`Garment lane: ${garmentData().label}`,`Designer / brand: ${value("brand")||"Unknown"}`,`Occasion: ${value("occasion")||"Still open"}`,`Event / wear date: ${formatDate(value("event-date"))}`,`Timing conversation: ${t.lane}`,`Garment description: ${value("garment-notes")||"Still open"}`,"",
    "FIT CONVERSATIONS",...(concernsList.length?concernsList.map(x=>`- ${x}`):["- No areas selected yet"]),`Most important outcome: ${value("priority")}`,`Previous alteration history: ${value("history")}`,`What I notice when wearing it: ${value("wear-notes")||"Still open"}`,"",
    "BRING / HANDOFF NOTES",...(bring.length?bring.map(x=>`- Ready: ${x}`):["- Bring list not marked yet"]),...(conditions.length?conditions.map(x=>`- ${x}`):["- Garment condition not noted"]),`Special handling / access: ${value("handling")||"Nothing noted"}`,"",
    "DATES TO DISCUSS",...milestones.map(([label,id])=>`- ${label}: ${formatDate(value(id))}`),`Fitting setting: ${value("setting")}`,`Best contact route: ${value("contact-route")}`,`Scheduling / pickup question: ${value("timeline-notes")||"Nothing noted"}`,"",
    "Planning note: This brief does not assess fit, take measurements, diagnose construction, recommend an alteration, quote, promise timing, confirm availability, schedule a fitting, accept a garment, approve rush service, collect payment, or place an order."
  ].join("\n");
}
function update(){
  const t=timing(), concernsList=selectedConcerns(), bring=checkedBring();
  $("brief-client").textContent=value("client")||"Your fitting";$("brief-garment").textContent=garmentData().label;$("brief-event").textContent=formatDate(value("event-date"));$("brief-timing").textContent=t.lane;$("brief-priority").textContent=value("priority");
  $("brief-concerns").innerHTML=(concernsList.length?concernsList:["Nothing selected yet"]).map(x=>`<i>${x}</i>`).join("");$("brief-bring").innerHTML=(bring.length?bring:["Checklist not marked"]).map(x=>`<i>${x}</i>`).join("");
  $("bring-count").textContent=`${bring.length} ready`;$("timing-lane").textContent=t.lane;$("timing-copy").textContent=t.copy;
  if($("event-date-copy").value!==value("event-date"))$("event-date-copy").value=value("event-date");
  const ready=[value("client")&&value("event-date"),concernsList.length>0,bring.length>0,value("first-fitting")||value("timeline-notes")].filter(Boolean).length;$("meter-label").textContent=`${ready}/4`;$("meter-bar").style.width=`${ready*25}%`;
  $("email-link").href=`mailto:info@twelvetailoring.com?subject=${encodeURIComponent(`Fitting brief${value("client")?` — ${value("client")}`:""}`)}&body=${encodeURIComponent(buildBrief())}`;
}
async function copyBrief(button){await navigator.clipboard.writeText(buildBrief());const span=button.querySelector("span");const old=span?span.textContent:button.textContent;if(span)span.textContent="Brief copied ✓";else button.textContent="Copied to clipboard ✓";setTimeout(()=>{if(span)span.textContent=old;else button.textContent=old},1600)}
document.querySelectorAll("input,textarea,select").forEach(x=>{if(!x.dataset.concern&&!x.dataset.bring)x.addEventListener("input",()=>{if(x.id==="event-date-copy")$("event-date").value=x.value;update()})});
document.querySelectorAll("[data-condition]").forEach(x=>x.addEventListener("change",update));
$("copy").addEventListener("click",()=>copyBrief($("copy")));$("copy-side").addEventListener("click",()=>copyBrief($("copy-side")));
$("reset").addEventListener("click",()=>{document.querySelectorAll("input:not([type=checkbox]),textarea").forEach(x=>x.value="");document.querySelectorAll("select").forEach(x=>x.selectedIndex=0);document.querySelectorAll("input[type=checkbox]").forEach(x=>x.checked=false);garment="bridal";renderGarments();renderConcerns();renderBring();update();window.scrollTo({top:0,behavior:"smooth"})});
renderGarments();renderConcerns();renderBring();update();
