---
title: SmartIQ ari-lopp-eesmargi hinnang (ET, rerun)
type: assessment
status: active
date: 2026-03-05
owner: Agent 0
source_milestones: docs/plans/2026-03-05-white-label-milestones-v3.md
---

# SmartIQ ari-lopp-eesmargi hinnang (ET, rerun)

## Eesmark

Uuendada business hinnangut parast M0-M9 gate-tsukli loppu, et eristada:
1. tehniline valmidus
2. ariline valmidus
3. launch-jargne peamine risk

## Otsus

Tehniliselt launch-ready, ariliselt veel eel-validatsiooni faasis.

Selgitus:
1. White-label tehniline programm (M0-M9) on dokumenteeritult lopetatud.
2. Operatiivne gate-susteem ja release usaldusvaarsus on olemas.
3. Kommertskinnitus on endiselt demo-tasemel (mitte production-verifitseeritud turusignaal).

## Tovendi baas (repo sees)

1. Milestone loppseis:
   - `docs/plans/2026-03-05-white-label-milestones-v3.md`
2. Lopp-handover:
   - `docs/plans/2026-03-05-m9-ga-handoff-package.md`
3. M1 kommertssignaal:
   - `docs/plans/2026-03-05-m1-payment-signal-validation.md`
   - `docs/plans/2026-03-05-m1-payment-signal-ledger.json` (`evidenceMode: demo`)
4. M2 juriidiline/IP memo:
   - `docs/plans/2026-03-05-m2-legal-ip-assessment.md` (demo-track)

## Skoorkaart (0-5)

| # | Kategooria | Skoor | Pohjendus |
| --- | --- | --- | --- |
| 1 | Probleemi-kliendi sobivus | 3 | ICP ja use-case on lukustatud, kuid reaalsed maksvad kliendid veel puuduvad. |
| 2 | Turu realistlikkus | 3 | White-label B2B suund on loogiline, kuid turunaitajad repo sees on veel demonstratiivsed. |
| 3 | Vaartuspakkumise tugevus | 3 | Tenant branding + admin + billing guardrails annavad selge B2B pakkumise. |
| 4 | Konkurentsieelise kaitstus | 2 | Tehniline kvaliteet on tugev, kuid moat ja IP kaitse pole valiselt verifitseeritud. |
| 5 | GTM teostatavus | 2 | GTM artefaktid on olemas, aga M1 andmestik on demo-reziimis. |
| 6 | Uhikuokonoomika kvaliteet | 2 | Hinnastusstruktuur eksisteerib, kuid LTV/CAC reaalsed andmed puuduvad. |
| 7 | Operatiivne teostatavus | 5 | M3-M9 gate-passid, release readiness ja runbookid on olemas. |
| 8 | Tiimi ja plaani sobivus | 2 | Tehniline execution on tugev, kuid bus-factor ja sales ownership risk on alles. |
| 9 | Finantside usutavus | 1 | Repo sees puudub production-finanstulemus/forecast mudel. |
| 10 | Riskijuhtimise kupsus | 4 | Gate-juhtimine on tugev, kuid kommerts- ja juriidiline risk pole lopuni suletud. |

Koguskoor: 27 / 50

Hinnangu kindlus:
1. tehniline osa: korge
2. ariline osa: keskmine-madal (demo-tovend)

## Kriitilised lungad enne agressiivset skaleerimist

1. M1 peab minema `DEMO` -> `REAL`:
   - asenda anonuumsed ORG-kirjed reaalse pipeline toendiga.
2. M2 peab minema sisemisest memo-st valise juriidilise kinnituse peale.
3. Vahemalt 1-2 maksvat pilooti peavad olema toodud tootetaseme KPI-tovendiga.

## Praegune seis (as-is)

Hinnang:
1. tehniliselt: toode on production-ready gate-loogika jargi
2. ariliselt: monetiseerimine on veel toestamata production-tasemel

Positiivne:
1. tenant-pohine white-label mehhanism on gate-passitud.
2. admin/ops/billing/reliability flow on dokumenteeritud ja testitud.
3. launch readiness + GA handoff on fikseeritud.

Negatiivne:
1. reaalse tasulise noudluse toend repo sees puudub.
2. IP/legal toend on hetkel demo-track.
3. sales execution ownership on aladokumenteeritud.

## 30 paeva prioriteet (business rerun)

1. Muuda M1 ledger production-reziimile:
   - min 10 kvalifitseeritud outreach
   - min 3 discovery call
   - min 2 paid-pilot-ready signaali reaalse organisatsiooni tasemel
2. Telli valine IP/legal arvamus ja asenda M2 memo production-kinnitusega.
3. Kaivita 1-2 tasulist pilooti ning logi:
   - onboarding time-to-value
   - 14/30 paeva aktivatsioon/retentsioon
   - renewal intent

## Canonical kontrollkusimused (joudluskriteerium)

Enne skaleerimist peavad olema vastatud:
1. Kas reaalsed kliendid maksavad?
2. Kas IP/legal risk on valise hinnanguga suletud?
3. Kas pilootkliendid uuendavad (renewal signal)?

Kui vastus mistahes punktile on "ei", siis ari-skaalumist ei tehta.
