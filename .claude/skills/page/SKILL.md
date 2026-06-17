---
name: page
description: Создать новую страницу по типу T01–T12
disable-model-invocation: true
---
1. СНАЧАЛА уточни у меня: URL-слаг, вложенность, привязка к меню (если не сказано).
2. Определи тип по docs/page-types/README.md, открой соответствующий T0x.md —
   это источник правды по блокам страницы.
3. Контент бери из site/<путь>/ (слепок старого сайта: content.md + INDEX.md + images/).
4. Новые страницы делаем в astro/src/raw-pages/ (НЕ новые HTML-прототипы —
   прототипы заморожены, см. PLAN.md этап 5). Шапка/футер — компоненты Astro.
5. Соблюдай: docs/conventions.md (URL = крошкам, абсолютные ассеты),
   docs/forms.md (формы), style.md (дизайн), picture.md (картинки).
6. Запиши страницу в structura.md (URL, путь, статус 🟡).
7. Скриншот: npm run build в astro/ → scripts/shot.sh — посмотри глазами.
8. git commit + отметка в PLAN.md. Скажи, что готово и что дальше.
