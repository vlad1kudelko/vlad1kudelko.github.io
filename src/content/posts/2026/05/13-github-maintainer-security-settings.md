---
title: "GitHub security settings для maintainer: что включить в open-source репозитории"
description: "Практический checklist для GitHub maintainer: branch protection, required reviews, secret scanning, Dependabot, code scanning, permissions и release hygiene."
heroImage: "../../../../assets/imgs/2026/05/13-github-maintainer-security-settings.png"
pubDate: "2026-05-13"
---

# Практический разбор: GitHub security settings для maintainer: что включить в open-source репозитории

Open-source репозиторий — это не только код. Это supply chain: issues, pull requests, Actions, releases, tokens, dependencies и maintainers. Даже небольшой проект может стать точкой атаки, если у него есть пользователи, GitHub Actions или опубликованные packages.

Хорошая новость: многие базовые меры безопасности включаются бесплатно и занимают мало времени. Они не делают проект неуязвимым, но закрывают простые двери.

## Branch protection

Основная ветка должна быть защищена. Минимальный набор:

- запрет force push;
- запрет удаления branch;
- required pull request before merge;
- required status checks;
- required linear history при необходимости;
- запрет обхода правил для большинства участников.

Если maintainer один, соблазн пушить напрямую велик. Но даже для solo-проекта PR workflow полезен: он запускает проверки и оставляет историю изменений.

## Required reviews

Для критичных репозиториев один review может остановить ошибку или вредоносный pull request. Если команда маленькая, можно требовать review только для важных директорий через CODEOWNERS.

Особенно внимательно стоит смотреть изменения в:

- `.github/workflows/`;
- package scripts;
- install hooks;
- release scripts;
- dependency lockfiles;
- Dockerfiles;
- auth/security code.

Workflow-файлы опасны тем, что могут получить доступ к secrets и выполнять команды в CI.

## Secret scanning

Secret scanning ищет токены, ключи и credentials. Для публичных репозиториев это must-have. Если доступен push protection, его стоит включить: лучше заблокировать секрет до попадания в историю, чем потом ротировать ключи.

Но scanning не отменяет discipline:

- не хранить `.env` в Git;
- использовать environment secrets;
- ограничивать scopes;
- выдавать короткоживущие tokens;
- ротировать ключи после утечки.

## Dependabot

Dependabot alerts показывают уязвимые зависимости, а Dependabot updates создаёт PR с обновлениями. Важно не только включить alerts, но и настроить cadence, иначе проект утонет в шуме.

Практический подход:

- security updates включить сразу;
- version updates — по расписанию;
- группировать patch/minor updates;
- обязательно запускать tests;
- не игнорировать lockfiles.

## Code scanning

CodeQL и другие анализаторы помогают ловить часть ошибок до релиза. Для языков с хорошей поддержкой CodeQL это дешёвый выигрыш. Результаты нужно triage-ить: false positives неизбежны, но полное игнорирование делает tool бесполезным.

## Permissions для Actions

GitHub Actions по умолчанию может получить слишком широкие права. Лучше явно задать минимальные permissions:

```yaml
permissions:
  contents: read
```

А для job, которому нужен publish или deploy, расширить права точечно. Это снижает ущерб, если workflow или dependency окажется скомпрометированным.

## Releases и provenance

Если проект публикует binaries или packages, release process должен быть воспроизводимым и понятным. Полезно подписывать artifacts, публиковать checksums и использовать trusted publishing там, где это возможно.

Пользователь должен понимать, что скачанный artifact действительно собран из ожидаемого commit.

## Итог

Maintainer security — это набор маленьких настроек, которые вместе сильно повышают устойчивость проекта. Branch protection, reviews, secret scanning, Dependabot, code scanning и минимальные Actions permissions закрывают самые очевидные риски.

Для open-source проекта безопасность начинается не с сложных инструментов, а с аккуратных defaults.
