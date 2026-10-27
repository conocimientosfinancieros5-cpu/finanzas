'use strict';
const app = document.querySelector('#app');
const storageStatus = document.querySelector('#storage-status');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let theme = 'auto';
try { const savedTheme = localStorage.getItem('finanzas-tema'); if (['auto', 'light', 'dark'].includes(savedTheme)) theme = savedTheme; } catch {}
function applyTheme() {
  const active = theme === 'auto' ? (systemTheme.matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = active;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', active === 'dark' ? '#242d34' : '#f3efe6');
}
systemTheme.addEventListener('change', applyTheme);
applyTheme();
const STORAGE_KEY = 'finanzas-progreso-v1';
let progress = Object.create(null);
let chapters = [], chapter, queue = [], position = 0, filter = 'Todas';
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const [id, p] of Object.entries(saved)) {
      if (p && Number.isInteger(p.intentos) && p.intentos > 0 && Number.isInteger(p.aciertos) && p.aciertos >= 0 && p.aciertos <= p.intentos && typeof p.ultimoResultado === 'boolean') progress[id] = p;
    }
  }
} catch { storageStatus.textContent = 'No se pudo leer el progreso guardado. Podés practicar igualmente.'; }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch { storageStatus.textContent = 'No se pudo guardar el progreso. Se conservará solo durante esta sesión.'; }
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action, className) {
  const node = element('button', text, className);
  node.type = 'button'; node.addEventListener('click', action); return node;
}
function heading(text) {
  const node = element('h1', text); node.tabIndex = -1; app.append(node); node.focus();
}
// Ids are "cNN-…", so progress can be summed without downloading every chapter.
const prefix = c => `c${String(c.n).padStart(2, '0')}-`;
function stats(chapterList) {
  let answered = 0, attempts = 0, correct = 0, total = 0;
  for (const c of chapterList) {
    total += c.total;
    for (const [id, p] of Object.entries(progress)) if (id.startsWith(prefix(c))) { answered++; attempts += p.intentos; correct += p.aciertos; }
  }
  return { answered, total, text: `${answered} de ${total} respondidas · ${attempts ? Math.round(correct / attempts * 100) : 0}% de aciertos` };
}
function home() {
  chapter = null; app.replaceChildren(); heading('Practicá finanzas');
  app.append(element('p', 'Un capítulo, una pregunta, un paso más.'));
  const appearance = element('label', 'Apariencia', 'appearance');
  const selector = element('select'); selector.setAttribute('aria-label', 'Tema de la aplicación');
  for (const [value, label] of [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']]) {
    const option = element('option', label); option.value = value; selector.append(option);
  }
  selector.value = theme;
  selector.addEventListener('change', () => {
    theme = selector.value; applyTheme();
    try { localStorage.setItem('finanzas-tema', theme); } catch { storageStatus.textContent = 'El tema se conservará solo durante esta sesión.'; }
  });
  appearance.append(selector); app.append(appearance);
  const all = stats(chapters);
  const panel = element('section', undefined, 'panel');
  panel.append(element('h2', 'Tu progreso total'), element('p', all.text));
  const bar = element('progress'); bar.max = all.total || 1; bar.value = all.answered; bar.setAttribute('aria-label', 'Preguntas respondidas'); panel.append(bar); app.append(panel);
  app.append(element('p', 'El porcentaje de aciertos incluye todos tus intentos.', 'meta'));
  const list = element('div', undefined, 'chapters');
  for (const c of chapters) {
    const item = button('', () => open(c, item), 'chapter');
    const summary = stats([c]);
    const copy = element('div', undefined, 'chapter-copy');
    copy.append(element('strong', c.titulo), element('span', c.total ? summary.text : 'Próximamente', 'meta'));
    if (c.total) {
      const mini = element('progress'); mini.max = summary.total; mini.value = summary.answered;
      mini.setAttribute('aria-label', 'Progreso del capítulo ' + c.n); copy.append(mini);
    }
    item.append(element('span', String(c.n).padStart(2, '0'), 'chapter-number'), copy);
    item.disabled = !c.total; list.append(item);
  }
  app.append(list);
}
async function open(c, item) {
  if (!c.questions) {
    item.disabled = true; item.setAttribute('aria-busy', 'true');
    try {
      const data = await json(`/data/cap-${String(c.n).padStart(2, '0')}.json`);
      if (data.capitulo !== c.n || !Array.isArray(data.preguntas) || !data.preguntas.every(q => q && typeof q.id === 'string' && q.id.startsWith(prefix(c)) && typeof q.pregunta === 'string' && typeof q.tema === 'string' && ['basica', 'intermedia', 'avanzada'].includes(q.dificultad) && Number.isInteger(q.correcta) && q.correcta >= 0 && q.correcta < 4 && [q.opciones, q.explicaciones].every(a => Array.isArray(a) && a.length === 4 && a.every(t => typeof t === 'string' && t.trim())))) throw new Error('Capítulo inválido');
      c.questions = data.preguntas;
    } catch {
      item.disabled = false; item.removeAttribute('aria-busy');
      storageStatus.textContent = 'No se pudo cargar el capítulo. Revisá tu conexión e intentá otra vez.'; return;
    }
  }
  storageStatus.textContent = ''; chapter = c; filter = 'Todas'; start();
}
function priority(q) { return !progress[q.id] ? 0 : progress[q.id].ultimoResultado ? 2 : 1; }
function start() {
  queue = chapter.questions.filter(q => filter === 'Todas' || progress[q.id]?.ultimoResultado === false).slice().sort((a, b) => priority(a) - priority(b));
  position = 0; practice();
}
function practice() {
  app.replaceChildren(); app.append(button('← Capítulos', home)); heading(chapter.titulo);
  app.append(element('p', stats([chapter]).text, 'meta'));
  const toolbar = element('div', undefined, 'toolbar');
  for (const label of ['Todas', 'Falladas']) {
    const control = button(label, () => { filter = label; start(); }); control.setAttribute('aria-pressed', String(filter === label)); toolbar.append(control);
  }
  toolbar.append(button('Reiniciar progreso', () => {
    if (!confirm('¿Borrar todo el progreso de este capítulo?')) return;
    for (const q of chapter.questions) delete progress[q.id]; save(); start();
  })); app.append(toolbar);
  if (!queue.length) { app.append(element('p', 'No tenés preguntas falladas. ¡Seguí practicando!')); return; }
  if (position >= queue.length) {
    app.append(element('h2', '¡Ronda completada!'), element('p', stats([chapter]).text), button('Seguir practicando', start, 'primary')); return;
  }
  const q = queue[position];
  const meta = element('div', undefined, 'question-meta');
  meta.append(element('span', `${position + 1} / ${queue.length}`, 'meta'), element('span', q.tema, 'chip'), element('span', q.dificultad, 'chip difficulty-' + q.dificultad));
  app.append(meta, element('h2', q.pregunta, 'question'));
  const options = element('div', undefined, 'options');
  const feedback = element('section'); feedback.id = 'feedback'; feedback.setAttribute('aria-live', 'polite'); feedback.setAttribute('aria-atomic', 'true');
  const next = button('Siguiente', () => { position++; practice(); }, 'primary'); next.hidden = true;
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let answered = false;
  for (const index of order) {
    const option = button(q.opciones[index], () => {
      if (answered) return; answered = true;
      const correct = index === q.correcta;
      const previous = progress[q.id] || { intentos: 0, aciertos: 0 };
      progress[q.id] = { intentos: previous.intentos + 1, aciertos: previous.aciertos + Number(correct), ultimoResultado: correct }; save();
      for (const control of options.children) {
        control.disabled = true;
        if (Number(control.dataset.index) === q.correcta) { control.classList.add('correct'); control.append(element('span', ' ✓ Correcta')); }
      }
      if (!correct) { option.classList.add('wrong'); option.append(element('span', ' ✗ Tu respuesta: incorrecta')); }
      feedback.className = 'panel ' + (correct ? 'correct' : 'wrong'); feedback.append(element('h2', correct ? '✓ ¡Correcto!' : '✗ Incorrecto'));
      if (!correct) feedback.append(element('h3', 'Tu respuesta'), element('p', q.explicaciones[index]));
      feedback.append(element('h3', 'Respuesta correcta'), element('p', q.explicaciones[q.correcta])); next.hidden = false;
    }); option.dataset.index = index; options.append(option);
  }
  const actions = element('div', undefined, 'next-action'); actions.append(next);
  app.append(options, feedback, actions);
}
async function json(url) { const response = await fetch(url); if (!response.ok) throw new Error(url); return response.json(); }
async function load() {
  app.setAttribute('aria-busy', 'true');
  try {
    const catalog = await json('/data/capitulos.json');
    if (!Array.isArray(catalog) || !catalog.every(c => Number.isInteger(c.n) && c.n > 0 && typeof c.titulo === 'string' && Number.isInteger(c.total) && c.total >= 0)) throw new Error('Catálogo inválido');
    chapters = catalog.map(c => ({ ...c, questions: null })); home();
  } catch { app.replaceChildren(element('h1', 'Finanzas'), element('p', 'No pudimos cargar los capítulos. Revisá tu conexión e intentá otra vez.'), button('Reintentar', load)); }
  finally { app.setAttribute('aria-busy', 'false'); }
}
load();
