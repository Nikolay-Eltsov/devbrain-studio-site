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

## Настройка проекта Pages

Build command — пусто. Output directory — `/`.
Custom domains: `devbrain.studio` и `*.devbrain.studio`.
