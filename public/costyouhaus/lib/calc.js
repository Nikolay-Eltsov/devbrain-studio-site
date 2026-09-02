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

/**
 * Честная почасовая ставка фрилансера.
 *
 * Вход (все величины — «в месяц»/«в неделю»/«в год», как названо в
 * product.json:inputs):
 *   income        желаемый доход, ₽/мес — то, что должно остаться на руках
 *   expenses      обязательные расходы, ₽/мес — инструменты, подписки, налоги
 *   hoursPerWeek  часы работы, часов/нед
 *   vacationWeeks недели отпуска в году
 *
 * Формула стандартная, без изобретения новых коэффициентов:
 *   paidHoursPerYear = hoursPerWeek × (52 − vacationWeeks)  — оплачиваемые часы
 *   yearlyNeed        = (income + expenses) × 12             — сколько нужно
 *                                                               заработать за год
 *   rate              = yearlyNeed / paidHoursPerYear
 *
 * Часть вводов делает результат бессмысленным не арифметически (там числа
 * посчитались бы), а по смыслу: отрицательная или нулевая ставка, отпуск
 * длиннее года, расходы, съедающие весь доход. В этих случаях считать
 * нечего — возвращаем null по всем выходам, а не NaN/Infinity: страница
 * должна сказать человеку, какое поле поправить, а не показать цифру,
 * которой нельзя верить.
 */

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

/**
 * @param {Record<string, unknown>} input значения полей из product.json:inputs
 * @returns {Record<string, unknown>} значения по product.json:outputs
 */
export function calc(input) {
  const income = Number(input.income);
  const expenses = Number(input.expenses);
  const hoursPerWeek = Number(input.hoursPerWeek);
  const vacationWeeks = Number(input.vacationWeeks);

  const nothingToCount =
    ![income, expenses, hoursPerWeek, vacationWeeks].every(Number.isFinite) ||
    income <= 0 ||
    expenses < 0 ||
    expenses >= income || // расходы съели весь доход — считать не для чего
    hoursPerWeek <= 0 ||
    vacationWeeks < 0 ||
    vacationWeeks >= WEEKS_PER_YEAR; // отпуск длиннее года — рабочих недель не осталось

  if (nothingToCount) {
    return { rate: null, yearlyNeed: null, paidHoursPerYear: null };
  }

  const paidHoursPerYear = hoursPerWeek * (WEEKS_PER_YEAR - vacationWeeks);
  const yearlyNeed = (income + expenses) * MONTHS_PER_YEAR;
  const rate = yearlyNeed / paidHoursPerYear;

  return { rate, yearlyNeed, paidHoursPerYear };
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
  // Все выходы этого продукта — рубли и часы: копейки и доли часа ставке не
  // нужны, а округление до целого держит разряды на месте при наборе.
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n));
}
