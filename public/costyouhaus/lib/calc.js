/**
 * Единственное место, где живёт расчёт продукта.
 *
 * Чистая функция без DOM, без сети, без времени «сейчас» в аргументах по
 * умолчанию — иначе её нельзя проверить кейсами. Всё, что меняется от запуска
 * к запуску (текущая дата, случайность), приходит ВХОДОМ.
 *
 * Её импортируют трое: страница (app.js), проверка (test/calc.test.mjs) и
 * экран коробки (mobile/tool.dart — там она переписана на Dart, кейсы те же).
 *
 * Формула — из IDEA.md, раздел «Что человек получает» (круг 3, O6/O7):
 *   продажных часов в месяц   N = (52 − W) × D × H / 12
 *   нужно заработать «грязными» = (M + E) / (1 − T / 100)
 *   ставка, ₽/час             = [(M + E) / (1 − T / 100)] / N
 *
 * Диапазоны — из IDEA.md, раздел «Обработка некорректного ввода» (O8):
 * календарные факты (7 дней в неделе, 52 недели в году, 24 часа в сутках) и
 * требование «знаменатель N строго больше нуля», а не выдуманные нормы.
 */

/**
 * @param {Record<string, unknown>} input значения полей из product.json:inputs
 *   - m: доход «на руки», ₽/месяц — число > 0, обязательное
 *   - e: расходы на работу, ₽/месяц — число ≥ 0, по умолчанию 0
 *   - t: доля государству/фондам, % — число от 0 до 99 включительно, по умолчанию 0
 *   - w: недель в году без работы (отпуск + болезни) — целое от 0 до 51 включительно
 *   - d: рабочих дней в неделю — целое от 1 до 7 включительно
 *   - h: часов в день, готовых продавать — число > 0 и ≤ 24
 * @returns {{rate: number, n: number, lowHours: boolean, expensesExceedIncome: boolean}}
 *   `rate` и `n` — по product.json:outputs. При вводе вне диапазонов выше оба —
 *   `NaN`: не `Infinity` и не отрицательное число, которые выглядели бы как
 *   настоящий результат и могли бы уйти в переписку с заказчиком (O8).
 *   `lowHours`/`expensesExceedIncome` — non-blocking сигналы из O11 (N < 1 час
 *   в месяц; E > M): они не блокируют расчёт и не портят `rate`/`n`, это
 *   сравнения чисел, которые ввёл сам пользователь, — не рыночные нормы.
 */
export function calc(input) {
  const m = Number(input.m);
  const e = input.e === undefined || input.e === null || input.e === '' ? 0 : Number(input.e);
  const t = input.t === undefined || input.t === null || input.t === '' ? 0 : Number(input.t);
  const w = Number(input.w);
  const d = Number(input.d);
  const h = Number(input.h);

  const valid =
    Number.isFinite(m) && m > 0 &&
    Number.isFinite(e) && e >= 0 &&
    Number.isFinite(t) && t >= 0 && t <= 99 &&
    Number.isInteger(w) && w >= 0 && w <= 51 &&
    Number.isInteger(d) && d >= 1 && d <= 7 &&
    Number.isFinite(h) && h > 0 && h <= 24;

  if (!valid) {
    return { rate: NaN, n: NaN, lowHours: false, expensesExceedIncome: false };
  }

  const n = ((52 - w) * d * h) / 12;
  const grossNeeded = (m + e) / (1 - t / 100);
  const rate = Math.round(grossNeeded / n);

  return {
    rate,
    n,
    lowHours: n < 1,
    expensesExceedIncome: e > m,
  };
}

/**
 * Человеческое представление результата — то, что реально видит посетитель.
 * Отделено от calc(), чтобы кейсы проверяли числа, а не форматирование.
 *
 * @param {Record<string, unknown>} out результат calc()
 * @returns {Record<string, string>}
 */
export function format(out) {
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, typeof v === 'number' ? formatNumber(v) : String(v)]),
  );
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n);
}
