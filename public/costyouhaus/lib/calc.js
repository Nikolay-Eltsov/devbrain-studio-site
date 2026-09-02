/**
 * Единственное место, где живёт расчёт продукта.
 *
 * Чистая функция без DOM, без сети, без времени «сейчас» в аргументах по
 * умолчанию — иначе её нельзя проверить кейсами. Всё, что меняется от запуска
 * к запуску (текущая дата, случайность), приходит ВХОДОМ.
 *
 * Её импортируют трое: страница (app.js), проверка (test/calc.test.mjs) и
 * экран коробки (mobile/tool.dart — там она переписана на Dart, кейсы те же).
 */

const WEEKS_PER_YEAR = 52;
const DAYS_PER_WEEK = 7;

/**
 * Честная часовая ставка: сколько нужно заработать за год до вычета налога,
 * делённое на то, сколько часов реально продаётся (год минус отпуск минус
 * непродаваемое время — поиск клиентов, админка).
 *
 * Правило на границе (В8/О8 из IDEA.md, «СМЕРТЕЛЬНО — решено»): продаваемые
 * часы не могут быть ≤0, а налог не может съедать весь доход целиком. Поле
 * само не пропускает такие значения (min/max в product.json), но calc() —
 * отдельная чистая функция, которую зовут и напрямую (кейсы, «что если»,
 * коробочный экран), поэтому границу держит она сама: вместо деления на ноль
 * или отрицательной ставки — явное «расчёта нет» (null), а не число. Страница
 * (app.js) уже ловит null/NaN/Infinity в главном результате и показывает
 * человеку текст вместо цифры, а не 0 и не ошибку в консоли.
 *
 * @param {Record<string, unknown>} input значения полей из product.json:inputs
 * @returns {{ hourlyRate: number | null, billableHoursPerYear: number | null, requiredRevenue: number | null }}
 */
export function calc(input) {
  const annualIncome = Number(input.annualIncome);
  const taxPercent = Number(input.taxPercent);
  const otherExpenses = Number(input.otherExpenses);
  const hoursPerWeek = Number(input.hoursPerWeek);
  const vacationDays = Number(input.vacationDays);
  const nonBillablePercent = Number(input.nonBillablePercent);

  const nothingToCalc = () => ({ hourlyRate: null, billableHoursPerYear: null, requiredRevenue: null });

  // Доход и расходы не бывают отрицательными и все входы обязаны быть
  // числами — на уровне поля это не пропускает валидация, здесь это ловится
  // на случай прямого вызова calc() в обход формы (О8).
  if (
    !Number.isFinite(annualIncome) || annualIncome < 0 ||
    !Number.isFinite(otherExpenses) || otherExpenses < 0 ||
    !Number.isFinite(taxPercent) ||
    !Number.isFinite(hoursPerWeek) ||
    !Number.isFinite(vacationDays) ||
    !Number.isFinite(nonBillablePercent)
  ) {
    return nothingToCalc();
  }

  // Сколько часов в год реально продаётся: год минус отпуск (в неделях),
  // помноженный на часы в неделю, минус доля непродаваемого времени.
  const workingWeeks = WEEKS_PER_YEAR - vacationDays / DAYS_PER_WEEK;
  const grossHoursPerYear = workingWeeks * hoursPerWeek;
  const billableHoursPerYear = grossHoursPerYear * (1 - nonBillablePercent / 100);

  // Доля дохода, которая останется после налога.
  const netFraction = 1 - taxPercent / 100;

  // Граница расчёта: отпуск и непродаваемое время перекрыли все рабочие
  // недели (продаваемых часов не осталось), либо налог забирает весь доход
  // целиком. Это состояние, а не число — hourlyRate = null вместо деления на
  // ноль или отрицательной ставки.
  if (billableHoursPerYear <= 0 || netFraction <= 0) {
    return {
      hourlyRate: null,
      billableHoursPerYear: round2(Math.max(billableHoursPerYear, 0)),
      requiredRevenue: null,
    };
  }

  const requiredRevenue = (annualIncome + otherExpenses) / netFraction;
  const hourlyRate = requiredRevenue / billableHoursPerYear;

  return {
    hourlyRate: round2(hourlyRate),
    billableHoursPerYear: round2(billableHoursPerYear),
    requiredRevenue: round2(requiredRevenue),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
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
