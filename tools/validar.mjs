import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function validar(base = root) {
  const errors = [], ids = new Set(), totals = new Map();
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const read = async file => JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  const dataDir = path.join(base, 'public/data');
  await mkdir(dataDir, { recursive: true });
  for (const file of (await readdir(dataDir)).filter(f => /^cap-.*\.json$/.test(f)).sort()) {
    const fail = message => errors.push(`${file}: ${message}`);
    if (!/^cap-\d{2}\.json$/.test(file)) fail('nombre esperado: cap-NN.json');
    try {
      const data = await read(path.join(dataDir, file));
      const n = Number(file.slice(4, -5));
      if (!data || data.capitulo !== n) fail('capitulo no coincide con el archivo');
      if (!text(data?.titulo)) fail('titulo vacío');
      if (!Array.isArray(data?.preguntas)) { fail('preguntas debe ser un array'); continue; }
      totals.set(n, data.preguntas.length);
      data.preguntas.forEach((q, i) => {
        const at = `pregunta ${i + 1}`;
        if (!q || typeof q !== 'object') { fail(`${at}: objeto inválido`); return; }
        if (!text(q.id)) fail(`${at}: id vacío`);
        else if (ids.has(q.id)) fail(`${at}: id duplicado global ${q.id}`);
        else if (!q.id.startsWith(`c${file.slice(4, 6)}-`)) fail(`${at}: id debe empezar con c${file.slice(4, 6)}-`);
        else ids.add(q.id);
        for (const field of ['tema', 'pregunta']) if (!text(q[field])) fail(`${at}: ${field} vacío`);
        if (!['basica', 'intermedia', 'avanzada'].includes(q.dificultad)) fail(`${at}: dificultad inválida`);
        for (const field of ['opciones', 'explicaciones']) {
          if (!Array.isArray(q[field]) || q[field].length !== 4 || !q[field].every(text)) fail(`${at}: ${field} debe tener 4 textos no vacíos`);
        }
        if (!Number.isInteger(q.correcta) || q.correcta < 0 || q.correcta > 3) fail(`${at}: correcta debe ser un entero 0-3`);
      });
    } catch (error) { fail(error.message); }
  }
  try {
    const catalog = await read(path.join(base, 'work/capitulos.json'));
    const numbers = new Set();
    if (!Array.isArray(catalog) || !catalog.every(c => {
      if (!c || !Number.isInteger(c.n) || c.n < 1 || c.n > 99 || !text(c.titulo) || numbers.has(c.n)) return false;
      numbers.add(c.n); return true;
    })) throw new Error('work/capitulos.json inválido o con capítulos duplicados');
    for (const n of totals.keys()) if (!numbers.has(n)) errors.push(`Capítulo ${n} no figura en work/capitulos.json`);
    await writeFile(path.join(dataDir, 'capitulos.json'), JSON.stringify(catalog.map(({ n, titulo }) => ({ n, titulo, total: totals.get(n) || 0 })), null, 2) + '\n', 'utf8');
  } catch (error) { errors.push(error.message); }
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await validar();
  for (const error of errors) console.error(error);
  console.log(errors.length ? `${errors.length} error(es).` : 'Datos válidos. Índice de capítulos regenerado.');
  process.exitCode = errors.length ? 1 : 0;
}
