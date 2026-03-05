---
title: SmartIQ business audit v2 (ET)
type: assessment
status: active
date: 2026-03-05
owner: Agent 0
based_on: docs/plans/2026-03-05-business-end-goal-assessment-et.md
---

# SmartIQ business audit v2 (ET)

## Eesmark

Teha uus samalaadne arihinnang olemasoleva business assessment dokumendi baasil, kasutades
repo sees verifitseeritavat toendit:
1. kas toode on tehniliselt valmis
2. kas ari on skaleerimiseks valmis
3. mis on peamised stop-faktorid

## Otsus

GO piiratud tasulise piloodi jaoks.  
NO-GO agressiivse skaleerimise jaoks.

Pohjendus:
1. M0-M9 milestone track on repos lopetatud (`DONE`).
2. Tehniline gate-susteem ja release usaldusvaarsus on olemas.
3. Kommertstovend on endiselt demo-reziimis (M1 ledger) ja M2 legal memo on demo-track.

## Tovendi alus (repo)

1. Milestone loppseis:
   - `docs/plans/2026-03-05-white-label-milestones-v3.md`
2. GA handoff:
   - `docs/plans/2026-03-05-m9-ga-handoff-package.md`
3. Kommerts-signaal:
   - `docs/plans/2026-03-05-m1-payment-signal-validation.md`
   - `docs/plans/2026-03-05-m1-payment-signal-ledger.json` (`evidenceMode: demo`)
4. Legal/IP:
   - `docs/plans/2026-03-05-m2-legal-ip-assessment.md` (demo-track)

## Skoorkaart (0-5)

| # | Kategooria | Skoor | Pohjendus |
| --- | --- | --- | --- |
| 1 | Probleemi-kliendi sobivus | 3 | ICP on lukus, kuid reaalse tasulise kliendinoude toend on piiratud. |
| 2 | Turu realistlikkus | 3 | White-label B2B suund on usutav, kuid repo sees puudub production-level market proof. |
| 3 | Vaartuspakkumise tugevus | 3 | Tenant branding + admin + usage/billing guardrails moodustavad selge paketi. |
| 4 | Konkurentsieelise kaitstus | 2 | Tehniline execution on hea, kuid moat ja IP kaitse on valise kinnituse puudumisega. |
| 5 | GTM teostatavus | 2 | GTM artefaktid olemas, kuid M1 andmestik on demonstratiivne. |
| 6 | Uhikuokonoomika kvaliteet | 2 | Hinnastus on defineeritud, kuid CAC/LTV reaalsed tulemused puuduvad. |
| 7 | Operatiivne teostatavus | 5 | Reliability, launch readiness ja GA handoff on gate-passitud. |
| 8 | Tiimi/plaani sobivus | 2 | Tehniline delivery on tugev, kuid sales ownership ja bus-factor on riskid. |
| 9 | Finantside usutavus | 1 | Finantsprognoos ja tegelik tootetaseme revenue toend puudub. |
| 10 | Riskijuhtimise kupsus | 4 | Engineering risk gates on tugevad, commercial/legal gates mitte lopuni suletud. |

Koguskoor: 27 / 50

Kindlus:
1. tehniline hinnang: korge
2. ariline hinnang: keskmine-madal

## Kriitilised stop-faktorid

1. M1 `DEMO -> REAL` muudatus tegemata (anonuumsed ORG kirjed, mitte verifitseeritud pipeline).
2. M2 legal/IP valine kinnitus puudub (hetkel sisemine demo memo).
3. Tasulise piloodi retention/renewal signaal puudub.

## Riskid (jargmised 60 paeva)

1. False positive launch readiness:
   - tehniline "green" voib varjata arilist "red" seisu.
2. Legal surprise risk:
   - IP vaidlus voib tekkida parast turule minekut.
3. Sales execution gap:
   - ilma kindla ownerita ei teki piisavat noudluse toendit.

## Praegune staatus

1. Tehniline staatus: production-ready (gate loogika jargi).
2. Business staatus: pilot-ready, scale-ready mitte.
3. Soovitus: hoida jargmine etapp kitsalt "commercial evidence sprint" formaadis.

## 30 paeva tegevusfookus (auditijargne)

1. M1 production evidence:
   - reaalsed organisatsioonid
   - kvalifitseeritud funnel toend
   - vahemalt 2 paid-pilot-ready signaali
2. M2 production legal closure:
   - valine juriidiline arvamus
   - riskiklassid + maandusplaan
3. Pilot outcome capture:
   - onboarding time-to-value
   - 14/30 paeva aktiivsus
   - renewal intent

## Canonical otsusereegel

Agressiivne skaleerimine lubatud ainult kui korraga on toene:
1. reaalsed maksesignaalid olemas
2. legal/IP valine kinnitus olemas
3. pilootidest on renewal signaal olemas

Kui mistahes punkt on "ei", jaab otsus: NO-GO skaleerimiseks.
