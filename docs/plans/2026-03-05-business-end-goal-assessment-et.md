---
title: SmartIQ arihinnangu baasdokument (ET)
type: assessment
status: active
date: 2026-03-05
owner: Agent 0
---

# SmartIQ arihinnangu baasdokument (ET)

## Eesmark

See dokument lukustab SmartIQ arilise lopp-eesmargi ja peamised piirangud, et tehniline arendus ei triiviks hobi-projekti suunas.

## Otsus

Paljulubav, kuid veel mitte rahastatav.

SmartIQ on tehniliselt ambitsioonikas trivia-manguplatvorm pre-beta faasis. Toode demonstreerib tugevat insenerikultuuri (CI-varavad, testid, operatsioonidokumentatsioon), kuid puuduvad:
1. arimudel
2. monetisatsiooniloogika
3. kasutajakontosusteem
4. turule mineku strateegia

Praegusel kujul on tegemist hasti ehitatud hobi-projektiga, mitte investeeritava ariga.

## Skoorkaart

| # | Kategooria | Skoor (0-5) | Pohjendus |
| --- | --- | --- | --- |
| 1 | Probleemi-kliendi sobivus | 2 | Smart10 digitaliseerimine on selge idee, kuid ICP on defineerimata (pered, sobergrupid, korporatiiv, haridus). |
| 2 | Turu realistlikkus | 3 | Trivia turg on reaalne, kuid TAM/SAM/SOM ja positsioneerimine puuduvad. |
| 3 | Vaartuspakkumise tugevus | 2 | "Smart10 digitaalselt" on arusaadav, kuid ei eristu incumbentidest. |
| 4 | Konkurentsieelise kaitstus | 1 | Puudub kaitstav moat; AI-sisu ja kopeeritav mehhaanika, voimalik IP-risk. |
| 5 | GTM teostatavus | 0 | Turule mineku plaan puudub. |
| 6 | Uhikuokonoomika kvaliteet | 0 | Hinnastus, tulu mudel, CAC/LTV puuduvad. |
| 7 | Operatiivne teostatavus | 3 | Tehniline baas on tugev, kuid Redis/staging/skaleerimisblokk on lahendamata. |
| 8 | Tiimi ja plaani sobivus | 1 | Uheinimese projekt; aritiimi rollid puuduvad. |
| 9 | Finantside usutavus | 0 | Finantsmudel ja prognoosid puuduvad. |
| 10 | Riskijuhtimise kupsus | 2 | Tehnilisi riske on markatud, kuid arilised ja juriidilised maandused puudulikud. |

Koguskoor: 14 / 50  
Hinnangu kindlus: korge (verifitseeritud koodist, konfiguratsioonist ja dokumentatsioonist)

## Kriitilised lungad (must-fix enne skaleerimist)

1. Arimudel puudub taielikult.
2. IP-risk Smart10 mehhaanika kopeerimise tottu.
3. Kasutajakontod ja autentimine puuduvad.

## Suured riskid

1. Uheinimese bussifaktor.
2. Sisuline ohukus (1080 kaarti keele kohta).
3. Kullastunud turg ja tugevad incumbendid.
4. Tehniline skaleerimisblokk (`synchronized` globaalne lukk).

## Norgad eeldused

1. "Smart10 digitaliseerimine iseenesest on piisav vaartuspakkumine."
2. "1080 kaarti per keel on piisav."
3. "Eesti lokaliseerimine on iseseisev konkurentsieelis."

## Praegune seis (as-is)

Hinnang: tehniline prototuup, mitte toode.

Positiivne:
1. Tugev CI/CD ja testikultuur.
2. Server-autoritatiivne mangumootor.
3. Professionaalne operatsioonidokumentatsioon.
4. API kvaliteet ja veataksonoomia.
5. EN + ET keeletoetus.

Negatiivne:
1. Pole reaalseid kasutajaid.
2. Pole arimudelit ega monetisatsiooni.
3. Pole kasutajakontosid.
4. Pole tootetaseme analyticsit.
5. Redis provisioning ja skaleerimisblokk lahendamata.

## Product-ready tee

Tehniline (hinnanguliselt 4-8 nadalat, 1 arendaja):
1. Redis provisioning ja deploy-parandused.
2. Per-session lock mudel (`synchronized -> per-gameId lock`).
3. Kasutajakontod (OAuth/email + profiil + ajalugu).
4. E2E testid CI-s.
5. Staging keskkond.
6. Sisubaasi kasv 3000+ kaardini per keel.

Ariline:
1. Monetisatsioonimudel.
2. Vahemalt uks valideeritud kasutajahankimise kanal.
3. Retentsioonistrateegia.

Regulatiivne:
1. IP-riski ametlik hinnang.
2. GDPR vastavus.

## White-label potentsiaal

Jah, kuid mitte kohene.

Tugevused:
1. Valine andmemudel (JSON/CSV import).
2. Konfigureeritavad kategooriad/keeled/teemad.
3. Struktureeritud REST API.
4. Dockeriseeritud deploy.

Puudujaagid:
1. Multi-tenant isolatsioon.
2. Admin paneel.
3. Branding/config API loplikuks vormistuseks.
4. Tenantipohine kasutajahaldus.
5. CMS + tenant analytics + litsentsihaldus.

Hinnanguline tee white-labelini: 4-6 kuud (2+ arendajat) parast product-ready baasi.

## 30 paeva prioriteet

1. Valideeri maksevalmidus (landing + hinnastus + email signups).
2. Lahenda IP-risk (juriidiline arvamus).
3. Kaivita suletud beeta reaalsete kasutajatega ja mooda 7-paeevast retentsiooni.

## Canonical lopp-eesmargi kontrollkusimused

Enne agressiivset white-label skaleerimist peavad olema vastatud:
1. Kas keegi maksab selle eest?
2. Kas IP-risk on lahendatav?
3. Kas sisu toob kasutajad tagasi?

Need kolm kusimust on SmartIQ arenduse canonical ariline gate.
