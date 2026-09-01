/**
 * Связывает манифест, расчёт и страницу. Продуктовой логики здесь нет —
 * она вся в lib/calc.js, иначе её не проверить кейсами.
 */
import { calc, format } from './lib/calc.js';

// Адрес считается от модуля, а не от страницы: продукт живёт в подпапке
// (owner.github.io/<slug>/), и путь от корня увёл бы запрос к чужому продукту.
const manifest = await fetch(new URL('product.json', import.meta.url)).then((r) => r.json());

const form = document.getElementById('form');
const out = document.getElementById('out');
const shareBtn = document.getElementById('share');
const examplesBox = document.getElementById('examples');

// ── Поля из манифеста ────────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);

for (const f of manifest.inputs) {
  const label = document.createElement('label');
  label.textContent = f.unit ? `${f.label}, ${f.unit}` : f.label;

  const input = document.createElement(f.options ? 'select' : 'input');
  input.id = f.id;
  input.name = f.id;
  if (f.options) {
    for (const opt of f.options) {
      const o = document.createElement('option');
      o.value = String(opt.value ?? opt);
      o.textContent = String(opt.label ?? opt);
      input.append(o);
    }
  } else {
    input.type = f.type ?? 'number';
    if (input.type === 'number') { input.inputMode = 'decimal'; input.step = f.step ?? 'any'; }
    if (f.placeholder) input.placeholder = f.placeholder;
  }
  input.value = params.get(f.id) ?? String(f.default ?? '');
  if (f.required) input.required = true;

  label.append(input);
  form.append(label);
}

// ── Пересчёт ─────────────────────────────────────────────────────────────────
function read() {
  const data = {};
  for (const f of manifest.inputs) {
    const el = form.elements[f.id];
    data[f.id] = f.type === 'number' || f.type == null ? Number(el.value) : el.value;
  }
  return data;
}

/** Поле пустое или не число — считать нечего, и врать нулём мы не будем. */
function firstBadField() {
  for (const f of manifest.inputs) {
    if (f.required === false) continue;
    const el = form.elements[f.id];
    const raw = String(el.value ?? '').trim();
    if (raw === '') return { f, why: 'не заполнено' };
    if ((f.type ?? 'number') === 'number' && !Number.isFinite(Number(raw))) {
      return { f, why: 'не число' };
    }
    if ((f.type ?? 'number') === 'number' && f.min != null && Number(raw) < f.min) {
      return { f, why: `меньше ${f.min}` };
    }
  }
  return null;
}

function render() {
  const bad = firstBadField();
  if (bad) {
    out.className = 'result muted';
    out.textContent = `${bad.f.label} — ${bad.why}.`;
    shareBtn.hidden = true;
    return;
  }
  out.className = 'result';

  const input = read();
  let result;
  try {
    result = calc(input);
  } catch {
    out.textContent = 'Проверьте введённые значения.';
    return;
  }
  if (Object.values(result).some((v) => typeof v === 'number' && !Number.isFinite(v))) {
    out.className = 'result muted';
    out.textContent = 'При таких значениях расчёт не имеет смысла — проверьте поля.';
    shareBtn.hidden = true;
    return;
  }
  const shown = format(result);
  const [head, ...rest] = manifest.outputs;

  out.innerHTML = '';
  const big = document.createElement('span');
  big.className = 'big';
  big.textContent = shown[head.id] + (head.unit ? ` ${head.unit}` : '');
  out.append(head.label ? Object.assign(document.createElement('div'), { textContent: head.label }) : '', big);

  for (const o of rest) {
    const row = document.createElement('div');
    row.className = 'row';
    row.append(
      Object.assign(document.createElement('span'), { textContent: o.label }),
      Object.assign(document.createElement('b'), { textContent: shown[o.id] + (o.unit ? ` ${o.unit}` : '') }),
    );
    out.append(row);
  }

  if (manifest.share?.enabled) {
    const url = new URL(location.href);
    url.search = new URLSearchParams(Object.entries(input).map(([k, v]) => [k, String(v)]));
    shareBtn.hidden = false;
    shareBtn.dataset.url = url.toString();
  }
}

// ── Примеры из кейсов ────────────────────────────────────────────────────────
for (const c of manifest.cases ?? []) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = c.name;
  b.addEventListener('click', () => {
    for (const [id, v] of Object.entries(c.input)) {
      if (form.elements[id]) form.elements[id].value = String(v);
    }
    render();
    out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  examplesBox.append(b);
}
if ((manifest.cases ?? []).length > 0) {
  const label = document.createElement('span');
  label.className = 'examples-label';
  label.textContent = 'Примеры:';
  examplesBox.prepend(label);
  examplesBox.hidden = false;
}

form.addEventListener('input', render);
shareBtn?.addEventListener('click', async () => {
  const url = shareBtn.dataset.url;
  if (navigator.share) { await navigator.share({ title: manifest.name, url }).catch(() => {}); return; }
  await navigator.clipboard.writeText(url);
  shareBtn.textContent = 'Ссылка скопирована';
  setTimeout(() => { shareBtn.textContent = 'Скопировать ссылку с расчётом'; }, 2000);
});

render();
