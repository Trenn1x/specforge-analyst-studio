const form = document.querySelector('#visit-form');
const goalButtons = [...document.querySelectorAll('[data-goal]')];
const symptomButtons = [...document.querySelectorAll('#symptoms button')];
const state = { goal: '', symptoms: [] };

const lanes = {
  deluxe: { name: 'Deluxe conversation', price: 'Published reference: $350', short: 'A broad starting point when the piano needs a more balanced visit or the history is unclear.' },
  seasonal: { name: 'Seasonal conversation', price: 'Published reference: $275', short: 'A possible starting point for a regularly serviced, stable piano that is already close to pitch.' },
  extended: { name: 'Extended conversation', price: 'Published reference: $450', short: 'Worth discussing when service is overdue, pitch is noticeably off, or the piano was moved recently.' },
  premium: { name: 'Premium half / full-day conversation', price: 'Published references: $650 / $1,300', short: 'A possible lane when several issues or deeper improvement goals may need more time.' },
  evaluation: { name: 'On-Site Evaluation conversation', price: 'Published reference: $275', short: 'A condition-focused starting point when the useful outcome is understanding the piano and its priorities.' },
  selection: { name: 'Piano Selection Help conversation', price: 'Published reference: $275', short: 'A starting point for comparing or inspecting a piano before purchase.' }
};

function values() {
  return Object.fromEntries(new FormData(form).entries());
}

function chooseLane(v) {
  const why = [];
  if (state.goal === 'selection') {
    why.push('You are comparing or choosing a piano.');
    return { ...lanes.selection, why };
  }
  if (state.goal === 'evaluation') {
    why.push('You want to understand condition before choosing work.');
    return { ...lanes.evaluation, why };
  }
  if (state.goal === 'several' || state.symptoms.length >= 4) {
    why.push(state.goal === 'several' ? 'You selected several or deeper issues.' : `${state.symptoms.length} separate observations are noted.`);
    why.push('Jeremy can decide whether a half or full day is actually warranted.');
    return { ...lanes.premium, why };
  }
  const overdue = ['About 2–4 years ago', 'More than 4 years ago', 'Unknown / never'].includes(v.lastService);
  const moved = ['Within the past month', '1–6 months ago'].includes(v.moved);
  if (state.goal === 'off' || overdue || moved) {
    if (state.goal === 'off') why.push('You described the piano as noticeably out of tune.');
    if (overdue) why.push('The service history is overdue or uncertain.');
    if (moved) why.push('A recent move may be useful context for Jeremy.');
    return { ...lanes.extended, why };
  }
  const current = ['Within 6 months', '6–18 months ago'].includes(v.lastService);
  if (state.goal === 'routine' && current && (!v.moved || v.moved === 'No recent move')) {
    why.push('You selected routine care.');
    why.push('The piano has been professionally serviced fairly recently.');
    return { ...lanes.seasonal, why };
  }
  if (state.goal === 'touch') why.push('Touch, tone, or a mechanical observation may need a balanced visit.');
  else if (state.goal === 'routine') why.push('You selected routine care, but the history is not narrow enough for the Seasonal lane yet.');
  else why.push('There is not enough detail for a narrower lane yet.');
  return { ...lanes.deluxe, why };
}

function prepLists(v) {
  const photos = ['Full view of the piano and the space directly around it', 'Keyboard and pedals in one clear photo'];
  if (v.model) photos.push('Make, model, and serial plate if it is safely visible');
  else photos.push('Any make, model, or serial marking you can safely find');
  if (state.symptoms.length) photos.push('A short video or sound clip of the specific issue, if repeatable');
  if (v.access && v.access !== 'Clear working space') photos.push('Access route and anything currently close to the piano');
  if (v.gate === 'Yes' || v.stairs === 'Yes') photos.push('Gate, stairs, or pass instructions that affect arrival');
  const questions = ['Is this the right starting lane once you see the history?', 'Is there anything I should avoid moving or testing before the visit?'];
  if (v.performanceDate) questions.push('Does the performance date change the useful timing?');
  if (v.humidity && v.humidity !== 'Climate controlled and stable') questions.push('Is the room or humidity context likely to affect the plan?');
  if (state.symptoms.includes('Broken string')) questions.push('Would a clear string-area photo help before the appointment?');
  return { photos, questions };
}

function readiness(v) {
  return [state.goal, v.pianoType, v.lastService, v.outcome || state.symptoms.length, v.location, v.access].filter(Boolean).length;
}

function brief(v, lane, prep) {
  const line = (label, value) => `${label}: ${value || 'Not added'}`;
  return [
    'LOWCOUNTRY PIANO VISIT BRIEF',
    '',
    line('Name', v.name),
    line('Location', v.location),
    line('Piano', [v.pianoType, v.model].filter(Boolean).join(' — ')),
    line('Last professional service', v.lastService),
    line('Recent move', v.moved),
    line('What brought me here', goalButtons.find(b => b.dataset.goal === state.goal)?.textContent),
    line('What I notice', state.symptoms.join(', ')),
    line('Useful outcome', v.outcome),
    line('Preferred timing', v.timing),
    line('Performance / recording date', v.performanceDate),
    line('Room / humidity', v.humidity),
    line('Working space', v.access),
    line('Gate / pass', v.gate),
    line('Stairs', v.stairs),
    line('Other notes', v.notes),
    '',
    `Conversation starting point: ${lane.name} (${lane.price.replace('Published reference: ', '').replace('Published references: ', '')})`,
    'Jeremy confirms the final service fit, pricing, and appointment details.',
    '',
    'QUESTIONS',
    ...prep.questions.map(q => `- ${q}`),
    '',
    'This brief is planning context only, not a diagnosis, quote, booking, or service selection.'
  ].join('\n');
}

function render() {
  const v = values();
  const lane = chooseLane(v);
  const prep = prepLists(v);
  const ready = readiness(v);
  document.querySelector('#lane-name').textContent = lane.name;
  document.querySelector('#lane-price').textContent = lane.price;
  document.querySelector('#lane-short').textContent = lane.short;
  document.querySelector('#lane-why').innerHTML = lane.why.map(x => `<li>${escapeHtml(x)}</li>`).join('');
  document.querySelector('#readiness').textContent = `${ready}/6 useful details`;
  document.querySelector('#meter-fill').style.width = `${Math.max(4, ready / 6 * 100)}%`;
  document.querySelector('#sum-piano').textContent = v.pianoType || 'Not added';
  document.querySelector('#sum-history').textContent = v.lastService || 'Not added';
  document.querySelector('#sum-issues').textContent = state.symptoms.length ? `${state.symptoms.length} noted` : 'None noted';
  document.querySelector('#sum-location').textContent = v.location || 'Not added';
  document.querySelector('#photo-list').innerHTML = prep.photos.map(x => `<li>${escapeHtml(x)}</li>`).join('');
  document.querySelector('#question-list').innerHTML = prep.questions.map(x => `<li>${escapeHtml(x)}</li>`).join('');
  const body = brief(v, lane, prep);
  document.querySelector('#email').href = `mailto:LowcountryPianoServices@gmail.com?subject=${encodeURIComponent('Piano visit details')}&body=${encodeURIComponent(body)}`;
  document.querySelector('#copy').dataset.brief = body;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

goalButtons.forEach(button => button.addEventListener('click', () => {
  state.goal = button.dataset.goal;
  goalButtons.forEach(b => b.classList.toggle('active', b === button));
  render();
}));

symptomButtons.forEach(button => button.addEventListener('click', () => {
  const value = button.textContent;
  if (value === 'Nothing specific') {
    state.symptoms = state.symptoms.includes(value) ? [] : [value];
  } else {
    state.symptoms = state.symptoms.filter(x => x !== 'Nothing specific');
    state.symptoms = state.symptoms.includes(value) ? state.symptoms.filter(x => x !== value) : [...state.symptoms, value];
  }
  symptomButtons.forEach(b => b.classList.toggle('active', state.symptoms.includes(b.textContent)));
  render();
}));

form.addEventListener('input', render);
form.addEventListener('change', render);

document.querySelector('#copy').addEventListener('click', async event => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(button.dataset.brief);
    button.firstChild.textContent = 'Brief copied ';
  } catch {
    const area = document.createElement('textarea');
    area.value = button.dataset.brief;
    document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
    button.firstChild.textContent = 'Brief copied ';
  }
  setTimeout(() => button.firstChild.textContent = 'Copy visit brief ', 1800);
});

document.querySelector('#save').addEventListener('click', event => {
  localStorage.setItem('lowcountryPianoVisit', JSON.stringify({ fields: values(), ...state }));
  event.currentTarget.textContent = 'Saved on this device';
  setTimeout(() => event.currentTarget.textContent = 'Save on this device', 1800);
});

document.querySelector('#reset').addEventListener('click', () => {
  form.reset(); state.goal = ''; state.symptoms = []; localStorage.removeItem('lowcountryPianoVisit');
  goalButtons.forEach(b => b.classList.remove('active')); symptomButtons.forEach(b => b.classList.remove('active')); render();
});

try {
  const saved = JSON.parse(localStorage.getItem('lowcountryPianoVisit'));
  if (saved) {
    Object.entries(saved.fields || {}).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value; });
    state.goal = saved.goal || ''; state.symptoms = saved.symptoms || [];
    goalButtons.forEach(b => b.classList.toggle('active', b.dataset.goal === state.goal));
    symptomButtons.forEach(b => b.classList.toggle('active', state.symptoms.includes(b.textContent)));
  }
} catch {}

render();
