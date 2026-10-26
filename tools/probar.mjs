import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { validar } from './validar.mjs';
const base = new URL('../work/demo/', import.meta.url);
await mkdir(new URL('public/data/', base), { recursive: true });
await mkdir(new URL('work/', base), { recursive: true });
const put = (file, value) => writeFile(new URL(file, base), JSON.stringify(value), 'utf8');
const questions = [1, 2, 3].map(n => ({ id: `c01-q00${n}`, tema: 'Valor del dinero', dificultad: 'basica', pregunta: `Pregunta ${n}: ¿cuánto es 100 más 10%?`, opciones: ['100', '110', '120', '90'], correcta: 1, explicaciones: ['No sumaste el interés.', '100 × 1,10 = 110.', 'Sumaste un 20%.', 'Restaste el interés.'] }));
const data = { capitulo: 1, titulo: 'Demo de finanzas', preguntas: questions };
await put('work/capitulos.json', [{ n: 1, titulo: data.titulo }, { n: 2, titulo: 'Sin archivo' }, { n: 3, titulo: 'Vacío' }]);
await put('public/data/cap-01.json', data);
await put('public/data/cap-03.json', { capitulo: 3, titulo: 'Vacío', preguntas: [] });
assert.deepEqual(await validar(fileURLToPath(base)), []);
const catalog = JSON.parse(await readFile(new URL('public/data/capitulos.json', base)));
assert.deepEqual(catalog.map(c => c.total), [3, 0, 0]);
await put('public/data/cap-03.json', { capitulo: 9, titulo: 'Inválido', preguntas: [{ ...questions[0], correcta: 4, opciones: ['A'], explicaciones: ['', '', '', ''] }] });
const errors = await validar(fileURLToPath(base));
for (const fragment of ['capitulo', 'duplicado', 'correcta', 'opciones', 'explicaciones']) assert(errors.some(e => e.includes(fragment)));
await put('public/data/cap-03.json', { capitulo: 3, titulo: 'Vacío', preguntas: [] });
await validar(fileURLToPath(base));
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.textContent = ''; this.className = ''; this.classList = { add: c => this.className += ` ${c}` }; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(k, v) { this.attributes[k] = v; }
  addEventListener(_, fn) { this.click = () => { if (!this.disabled) fn(); }; }
  focus() {}
}
const app = new Node('main'), status = new Node('p');
let saved = '{}', confirmation = false;
const context = vm.createContext({ document: { querySelector: s => s === '#app' ? app : status, createElement: tag => new Node(tag) }, localStorage: { getItem: () => saved, setItem: (_, value) => { saved = value; } }, confirm: () => confirmation, fetch: async url => ({ ok: !url.includes('02'), json: async () => url.endsWith('capitulos.json') ? catalog : url.includes('01') ? data : { capitulo: 3, preguntas: [] } }), console });
const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const run = code => vm.runInContext(code, context);
const all = node => [node, ...node.children.flatMap(all)];
const text = node => [node.textContent, ...node.children.map(text)].join(' ');
const click = label => { const b = all(app).find(n => n.tag === 'button' && n.textContent === label); assert(b, label); b.click(); };
vm.runInContext(source, context);
await new Promise(resolve => setImmediate(resolve));
assert.equal(all(app).filter(n => n.tag === 'button' && n.disabled).length, 2);
all(app).find(n => n.tag === 'button' && !n.disabled).click(); await new Promise(resolve => setImmediate(resolve));
assert.equal(run('queue[0].id'), 'c01-q001');
click('100');
assert(text(app).includes('Incorrecto')); assert(text(app).includes('No sumaste el interés.')); assert(text(app).includes('100 × 1,10 = 110.'));
assert.equal(JSON.parse(saved)['c01-q001'].intentos, 1);
const restored = vm.createContext({ ...context, document: { querySelector: () => new Node('main'), createElement: tag => new Node(tag) } });
vm.runInContext(source, restored);
await new Promise(resolve => setImmediate(resolve));
assert.equal(vm.runInContext("progress['c01-q001'].ultimoResultado", restored), false);
click('Siguiente'); click('110'); assert(text(app).includes('¡Correcto!'));
run('start()'); assert.equal(run('queue.map(q => q.id).join()'), 'c01-q003,c01-q001,c01-q002');
click('Falladas'); assert.equal(run('queue.length'), 1);
click('Reiniciar progreso'); assert.equal(Object.keys(JSON.parse(saved)).length, 2);
confirmation = true; click('Reiniciar progreso'); assert.equal(saved, '{}');
run("localStorage.setItem = () => { throw new Error('blocked'); }; filter = 'Todas'; start();");
click('110'); assert(status.textContent.includes('No se pudo guardar'));
run("progress = Object.create(null); localStorage.getItem = () => saved;");
// A fresh execution loads valid progress; corrupt and blocked storage must not prevent startup.
for (const value of ['{', '{"q":{"intentos":-1}}']) {
  saved = value;
  const fresh = vm.createContext({ ...context, document: context.document });
  vm.runInContext(source, fresh); await new Promise(resolve => setImmediate(resolve));
}
console.log('OK: validador, ausentes/vacíos, orden, corrección y explicaciones, filtros, confirmación, progreso y fallos de almacenamiento.');
const handlers = {}, cached = new Map();
let offline = false, redirected = false;
const swContext = vm.createContext({ URL, Response, self: { location: { origin: 'http://localhost' }, addEventListener: (type, fn) => { handlers[type] = fn; } }, caches: { open: async () => ({ match: async key => cached.get(typeof key === 'string' ? key : key.url), put: async (key, value) => { cached.set(typeof key === 'string' ? key : key.url, value); } }), keys: async () => [] }, fetch: async () => {
  if (offline) throw new Error('offline');
  const response = new Response('network');
  Object.defineProperty(response, 'redirected', { value: redirected }); return response;
} });
vm.runInContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), swContext);
let install; handlers.install({ waitUntil: p => { install = p; } }); await install;
assert(cached.has('/app.js')); assert(cached.has('/styles.css')); assert(!cached.has('/index.html'));
async function request(path, mode) {
  let result; const req = { method: 'GET', url: `http://localhost${path}`, mode };
  handlers.fetch({ request: req, respondWith: p => { result = p; } }); return result;
}
assert.equal(await (await request('/data/cap-01.json')).text(), 'network');
offline = true;
assert.equal(await (await request('/data/cap-01.json')).text(), 'network');
assert.equal(await (await request('/', 'navigate')).text(), 'network');
assert.equal((await request('/data/missing.json')).status, 503);
offline = false; redirected = true;
await request('/data/redirect.json'); assert(!cached.has('http://localhost/data/redirect.json'));
console.log('OK: service worker, precaché, network-first, respaldo offline y rechazo de redirecciones.');
