const form = document.querySelector('#fit-form');
const baseButtons = [...document.querySelectorAll('#base-choices button')];
const woodButtons = [...document.querySelectorAll('#wood-choices button')];
let orientation = 'lengthwise';
let base = 'Signature farm direction';
let wood = 'Not sure yet';

const $ = selector => document.querySelector(selector);
const values = () => Object.fromEntries(new FormData(form).entries());
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function fitResult(v) {
  const roomL = Number(v.roomLength) * 12;
  const roomW = Number(v.roomWidth) * 12;
  const tableL = Number(v.tableLength) * 12;
  const tableW = Number(v.tableWidth);
  const clearance = Number(v.clearance);
  const requiredL = tableL + clearance * 2;
  const requiredW = tableW + clearance * 2;
  const usedL = orientation === 'lengthwise' ? requiredL : requiredW;
  const usedW = orientation === 'lengthwise' ? requiredW : requiredL;
  const marginL = roomL - usedL;
  const marginW = roomW - usedW;
  const complete = roomL > 0 && roomW > 0;
  const status = !complete ? 'Add the room dimensions' : marginL >= 0 && marginW >= 0 ? 'Clearance fits on paper' : marginL >= -12 && marginW >= -12 ? 'Close — worth a human look' : 'Try another size or orientation';
  const tone = !complete ? 'empty' : marginL >= 0 && marginW >= 0 ? 'good' : marginL >= -12 && marginW >= -12 ? 'close' : 'tight';
  return {roomL,roomW,tableL,tableW,clearance,usedL,usedW,marginL,marginW,status,tone};
}

function lists(v) {
  const photos = ['The room from each main doorway','The full path from the exterior door to the room','A tape measure showing the room length and width'];
  if (v.rug !== 'No rug planned') photos.push('The rug and its measured dimensions');
  if (v.stairs === 'Yes') photos.push('Stairs, turns, and the narrowest landing');
  if (wood === 'My own sentimental wood') photos.push('Both faces, ends, and any damage in the sentimental wood');
  const questions = ['Is this size sensible for the base style and room?','Which wood and finish direction best fits the use?','What should be measured before a shop appointment?'];
  if (wood === 'My own sentimental wood') questions.push('Can this sentimental wood be evaluated for the build?');
  if (v.setting === 'Outdoor') questions.push('Which outdoor material and care constraints matter here?');
  if (v.stairs === 'Yes' || Number(v.doorway) > 0) questions.push('Does the access path change how the table should be built or delivered?');
  return {photos,questions};
}

function makeBrief(v, fit, questions) {
  return [
    'LANDRUM TABLE FIT PLANNING BRIEF','',
    `Name: ${v.name || 'Not added'}`,
    `Location: ${v.location || 'Not added'}`,
    `Room: ${v.roomLength || '?'}' × ${v.roomWidth || '?'}'`,
    `Table starting point: ${v.tableLength}' × ${v.tableWidth}"`,
    `Orientation: ${orientation}`,
    `Requested open clearance: ${v.clearance}" around the table`,
    `Desired seating goal: ${v.seats}`,
    `Rough fit read: ${fit.status}`,
    `Base direction: ${base}`,
    `Wood direction: ${wood}`,
    `Setting: ${v.setting}`,
    `Finish direction: ${v.finish}`,
    `Rug: ${v.rug}`,
    `Narrowest doorway: ${v.doorway ? `${v.doorway}"` : 'Not added'}`,
    `Stairs / tight turns: ${v.stairs}`,
    `Other notes: ${v.notes || 'None added'}`,'',
    'QUESTIONS',...questions.map(item => `- ${item}`),'',
    'This is a room-planning starting point, not a quote, order, availability check, delivery approval, or guarantee of fit. Landrum Tables confirms the build details.'
  ].join('\n');
}

function render() {
  const v = values();
  const fit = fitResult(v);
  const list = lists(v);
  $('#clearance-output').textContent = `${v.clearance}"`;
  $('#room-l-label').textContent = `${v.roomLength || '?'}'`;
  $('#room-w-label').textContent = `${v.roomWidth || '?'}'`;
  $('#table-label').textContent = `${v.tableLength}' × ${v.tableWidth}"`;
  $('#fit-status').className = `fit-status ${fit.tone}`;
  $('#fit-status').innerHTML = `<i></i>${escapeHtml(fit.status)}`;
  $('#fit-title').textContent = fit.status;
  $('#fit-copy').textContent = `The sketch uses ${v.clearance}" of open space around a ${v.tableLength}' × ${v.tableWidth}" starting point. Rotate it or adjust the room to compare.`;
  $('#footprint').textContent = `${Math.round(fit.usedL / 12 * 10) / 10}' × ${Math.round(fit.usedW / 12 * 10) / 10}'`;
  $('#margin-l').textContent = fit.roomL ? `${Math.round(fit.marginL)}"` : '—';
  $('#margin-w').textContent = fit.roomW ? `${Math.round(fit.marginW)}"` : '—';
  const readiness = [v.roomLength,v.roomWidth,base,wood,v.location,v.doorway].filter(Boolean).length;
  $('#readiness').textContent = `${readiness}/6 useful details`;
  $('#meter-fill').style.width = `${Math.max(4,readiness/6*100)}%`;
  const roomL = fit.roomL || 168, roomW = fit.roomW || 132;
  const rawL = Math.min(82,Math.max(22,fit.tableL/roomL*100));
  const rawW = Math.min(68,Math.max(15,fit.tableW/roomW*100));
  const visualW = orientation === 'lengthwise' ? rawL : rawW;
  const visualH = orientation === 'lengthwise' ? rawW : rawL;
  $('#table-shape').style.width = `${visualW}%`;
  $('#table-shape').style.height = `${visualH}%`;
  $('#clearance-zone').style.width = `${Math.min(96,visualW+fit.clearance*2/roomL*100)}%`;
  $('#clearance-zone').style.height = `${Math.min(94,visualH+fit.clearance*2/roomW*100)}%`;
  $('#photo-list').innerHTML = list.photos.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  $('#question-list').innerHTML = list.questions.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const brief = makeBrief(v,fit,list.questions);
  $('#copy').dataset.brief = brief;
  $('#email').href = `mailto:landrumtables@gmail.com?subject=${encodeURIComponent('Custom table planning brief')}&body=${encodeURIComponent(brief)}`;
}

baseButtons.forEach(button => button.addEventListener('click', () => {
  base = button.textContent;
  baseButtons.forEach(item => item.classList.toggle('active', item === button));
  render();
}));
woodButtons.forEach(button => button.addEventListener('click', () => {
  wood = button.textContent;
  woodButtons.forEach(item => item.classList.toggle('active', item === button));
  render();
}));
$('#orientation').addEventListener('click', event => {
  orientation = orientation === 'lengthwise' ? 'crosswise' : 'lengthwise';
  event.currentTarget.firstChild.textContent = orientation === 'lengthwise' ? 'Lengthwise ' : 'Crosswise ';
  render();
});
form.addEventListener('input',render);
form.addEventListener('change',render);

$('#copy').addEventListener('click', async event => {
  const button = event.currentTarget;
  try { await navigator.clipboard.writeText(button.dataset.brief); }
  catch {
    const area=document.createElement('textarea');area.value=button.dataset.brief;document.body.append(area);area.select();document.execCommand('copy');area.remove();
  }
  button.firstChild.textContent='Brief copied ';
  setTimeout(()=>button.firstChild.textContent='Copy planning brief ',1800);
});

$('#save').addEventListener('click', event => {
  localStorage.setItem('landrumTableFitPlan',JSON.stringify({fields:values(),orientation,base,wood}));
  event.currentTarget.textContent='Saved locally';
  setTimeout(()=>event.currentTarget.textContent='Save on this device',1800);
});

$('#reset').addEventListener('click', () => {
  form.reset();orientation='lengthwise';base='Signature farm direction';wood='Not sure yet';localStorage.removeItem('landrumTableFitPlan');
  $('#orientation').firstChild.textContent='Lengthwise ';
  baseButtons.forEach((item,index)=>item.classList.toggle('active',index===0));
  woodButtons.forEach(item=>item.classList.toggle('active',item.textContent===wood));render();
});

try {
  const saved=JSON.parse(localStorage.getItem('landrumTableFitPlan'));
  if(saved){Object.entries(saved.fields||{}).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value});orientation=saved.orientation||orientation;base=saved.base||base;wood=saved.wood||wood;baseButtons.forEach(item=>item.classList.toggle('active',item.textContent===base));woodButtons.forEach(item=>item.classList.toggle('active',item.textContent===wood));$('#orientation').firstChild.textContent=orientation==='lengthwise'?'Lengthwise ':'Crosswise '}
} catch {}
render();
