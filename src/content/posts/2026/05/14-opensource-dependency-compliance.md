---
title: "Open-source dependency compliance: как управлять лицензиями и рисками в больших проектах"
description: "Как построить процесс контроля open-source зависимостей: inventory, SBOM, license policies, vulnerability scanning, approvals, transitive dependencies и audit trail."
heroImage: "../../../../assets/imgs/2026/05/14-opensource-dependency-compliance.png"
pubDate: "2026-05-14"
---

# Практический разбор: Open-source dependency compliance: как управлять лицензиями и рисками в больших проектах

Современное приложение почти всегда состоит из open-source зависимостей. Прямые библиотеки видны в `package.json`, `requirements.txt` или `go.mod`, но реальный граф намного шире: transitive dependencies, build tools, Docker images, GitHub Actions, system packages. Compliance нужен, чтобы понимать, что именно используется, на каких условиях и с какими рисками.

Это не только юридическая тема. Управление зависимостями влияет на безопасность, supply chain, скорость обновлений и возможность выпускать продукт без сюрпризов.

## Inventory

Первый шаг — знать список компонентов. Нужен inventory для:

- application dependencies;
- transitive dependencies;
- container base images;
- CI/CD actions;
- vendored code;
- binaries в репозитории;
- dev dependencies, если они участвуют в build.

Без inventory невозможно ответить на простой вопрос: затрагивает ли нас новая уязвимость или license issue?

## SBOM

SBOM — software bill of materials — формализует список компонентов. Форматы вроде CycloneDX или SPDX позволяют передавать информацию между tools и командами.

SBOM полезен не только для enterprise compliance. Он помогает быстро оценить blast radius при уязвимости в популярной библиотеке. Если компонент есть в SBOM, его можно найти по всем продуктам.

## License policies

Лицензии open-source различаются. MIT и Apache-2.0 обычно проще для коммерческого использования, GPL/AGPL требуют более внимательного анализа, а неизвестные или кастомные лицензии могут быть проблемой.

Policy должна описывать:

- разрешённые лицензии;
- лицензии, требующие review;
- запрещённые лицензии;
- процесс exception;
- кто принимает решение;
- как фиксируется approval.

Важно не блокировать разработку шумом. Если policy слишком жёсткая и непонятная, её начнут обходить.

## Vulnerability scanning

Compliance и security тесно связаны. Сканер зависимостей должен показывать CVE, severity, reachable usage, available fix и статус triage. Но raw список уязвимостей быстро превращается в сотни alerts.

Нужны правила приоритизации:

- exploitability;
- наличие fix;
- используется ли vulnerable code path;
- internet-facing компонент или нет;
- compensating controls;
- срок исправления по severity.

## Transitive dependencies

Большая часть рисков приходит транзитивно. Разработчик добавляет одну библиотеку, а вместе с ней приходит десяток пакетов. Поэтому approval только прямых зависимостей недостаточен.

При обновлениях важно смотреть lockfile diff. Иногда minor update приносит новый пакет, новый license или postinstall script.

## CI/CD enforcement

Процесс работает лучше, если встроен в pipeline:

- scan на pull request;
- блокировка запрещённых лицензий;
- предупреждение по новым high/critical CVE;
- генерация SBOM на release;
- сохранение отчётов как artifacts;
- audit trail approvals.

Но enforcement должен быть предсказуемым. Разработчик должен видеть, почему PR заблокирован и что сделать дальше.

## Governance без бюрократии

Хороший compliance-процесс помогает, а не мешает. Он даёт self-service: понятные правила, автоматические checks, быстрый exception path и dashboard состояния. Юристы, security и engineering работают по одному источнику данных.

## Итог

Open-source dependency compliance — это управление реальным составом продукта. Inventory, SBOM, license policies, vulnerability scanning и CI enforcement позволяют контролировать риски без ручной паники.

Чем раньше проект начинает учитывать зависимости как часть supply chain, тем проще масштабировать разработку и проходить проверки без авралов перед релизом.
