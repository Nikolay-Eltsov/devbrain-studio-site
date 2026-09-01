# devbrain.studio

Витрина студии: один проект Cloudflare Pages на все продукты.

**Этот репозиторий собирается скриптом — руками сюда не коммитят.**
Источник правды — репозитории продуктов; сборка:

```bash
cd /Users/eltsov_ni/fast
node bin/sync-site.mjs --commit
git -C site push
```

В сборку попадает только продукт, прошедший собственную проверку
(`tools/check.mjs`). Незаполненный продукт до живого адреса не доезжает.

## Раскладка

| Что | Адрес |
|---|---|
| Витрина, список продуктов | `https://devbrain.studio/` |
| Продукт | `https://<slug>.devbrain.studio/` |

`_worker.js` разводит поддомены по папкам внутри одного проекта — поэтому новый
продукт не требует ни нового проекта Pages, ни новой записи DNS.

## Раскладка репозитория

| Файл | Что это |
|---|---|
| `wrangler.jsonc` | Конфиг: `main` — роутер, `assets.directory` — папка статики. |
| `worker.js` | Роутер: поддомен → папка. Лежит **вне** `public/`. |
| `public/` | Всё, что раздаётся наружу: витрина и папки продуктов. |

`worker.js` вне `public/` не по вкусу, а по необходимости: файл внутри папки
ассетов раздаётся наружу как обычная статика, и серверный код там оказаться не
должен. Именно на это ругается wrangler ошибкой
«Uploading a Pages `_worker.js` file as an asset».

## Настройка проекта

Тип — Worker (Workers Builds). Build command — пусто.
Deploy command — `npx wrangler deploy`. Root directory — `/`.
Custom domains: `devbrain.studio` и `*.devbrain.studio`.
