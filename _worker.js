/**
 * Разводит поддомены по папкам продуктов внутри одного проекта Pages.
 *
 *   costyouhaus.devbrain.studio/       → /costyouhaus/index.html
 *   costyouhaus.devbrain.studio/x.css  → /costyouhaus/x.css
 *   devbrain.studio/                   → / (витрина со списком)
 *
 * Зачем один проект вместо проекта на продукт: настройка хостинга перестаёт
 * быть работой на каждом продукте. Заводится новый продукт — появляется папка,
 * и он уже раздаётся. Ничего в панели Cloudflare руками не создаётся.
 */
const APEX = 'devbrain.studio';

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
      // Только один уровень: a.b.devbrain.studio продуктом не считается.
      if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        url.hostname = APEX;
        url.pathname = `/${slug}${url.pathname}`;
        const res = await env.ASSETS.fetch(new Request(url, request));
        if (res.status !== 404) return res;
        // Неизвестный поддомен не притворяется продуктом — уводим на витрину.
        return Response.redirect(`https://${APEX}/`, 302);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
