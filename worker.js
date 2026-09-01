/**
 * Разводит поддомены по папкам продуктов внутри одного проекта.
 *
 *   costyouhaus.devbrain.studio/       → public/costyouhaus/index.html
 *   costyouhaus.devbrain.studio/x.css  → public/costyouhaus/x.css
 *   devbrain.studio/                   → public/index.html (витрина)
 *   что-угодно.devbrain.studio/        → редирект на витрину
 *
 * Зачем один проект вместо проекта на продукт: настройка хостинга перестаёт
 * быть работой на каждом продукте. Появилась папка в `public/` — продукт
 * раздаётся. Ничего в панели Cloudflare руками не создаётся.
 *
 * Работает это только вместе с `run_worker_first: true` в `wrangler.jsonc`:
 * иначе статика отдаётся до скрипта, и разводить по хосту становится нечем.
 */
const APEX = 'devbrain.studio';
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const toApex = () => Response.redirect(`https://${APEX}/`, 302);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Апекс и www — витрина как есть.
    if (host === APEX || host === `www.${APEX}`) {
      return env.ASSETS.fetch(request);
    }

    if (host.endsWith(`.${APEX}`)) {
      const slug = host.slice(0, -(APEX.length + 1));

      // Только один уровень и только латиница: `a.b.devbrain.studio` и
      // кириллические имена продуктом не считаются. Кириллица сюда приходит
      // уже в punycode (`xn--…`) и на этом правиле честно отсекается.
      if (SLUG.test(slug) && !slug.startsWith('xn--')) {
        const prefix = `/${slug}`;
        url.pathname = `${prefix}${url.pathname}`;
        const res = await env.ASSETS.fetch(new Request(url, request));

        // Неизвестный поддомен НЕ показывает витрину под своим именем:
        // иначе одна и та же страница индексируется на бесконечном числе
        // хостов, и поиск считает это дублями.
        if (res.status === 404) return toApex();

        // html_handling: "auto-trailing-slash" (по умолчанию) сам решает
        // редиректить /x.html → /x или /папка/ → /папка/index.html. Такой
        // редирект отдаётся ассетами относительно УЖЕ переписанного пути
        // (с префиксом slug), а браузер, всё ещё стоя на поддомене продукта,
        // применит его как есть — и воркер на следующем заходе подставит
        // slug ещё раз (`/slug/slug/...`) → 404 → редирект на апекс. Снимаем
        // префикс с Location, чтобы редирект остался внутри поддомена.
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location');
          if (location && (location === prefix || location.startsWith(`${prefix}/`))) {
            const stripped = location.slice(prefix.length) || '/';
            const headers = new Headers(res.headers);
            headers.set('location', stripped);
            return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
          }
        }

        return res;
      }
    }

    return toApex();
  },
};
