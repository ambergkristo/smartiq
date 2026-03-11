# Editorial Review Set

## Metadata

- Date: 2026-03-11
- Seed: `smartiq-sprint-2.5-editorial-review`
- Spot-check report: `docs\reports\2026-03-11-editorial-spot-check.md`

## Sampling Method

- Deterministic selection only; no random picks after generation.
- Per locale, sample 10 cards.
- Coverage includes all previously highest-risk repaired `OPEN` areas: `Sports`, `Geography`, `Culture`, `Science`, `Varia`.
- Coverage also includes one card from each non-OPEN category family: `TRUE_FALSE`, `NUMBER`, `ORDER`, `CENTURY_DECADE`, `COLOR`.
- Selection rule: sort matching cards by `id`, then pick `hash(seed|locale|topic|category) mod count`.

## EN Sample

### EN-01

- Bucket: `priority_open`
- Card: `sports-open-009`
- Topic/category: `Sports/OPEN`
- Question: Sports: Which statements about ice hockey are true?
- Expected correct: `6, 7, 8, 9`

Options:
0. Ice hockey is played on clay courts.
1. Ice hockey is a water-only sport.
2. A match is decided by golf par.
3. Players serve over a net like tennis.
4. Ice hockey uses boxing gloves to score.
5. Ice hockey uses wickets and overs.
6. A side has six players with goalie.
7. Teams skate on ice in hockey.
8. Ice hockey is played with a puck.
9. A power play follows some penalties.

### EN-02

- Bucket: `priority_open`
- Card: `geography-open-030`
- Topic/category: `Geography/OPEN`
- Question: Geography: Which statements about the Rhine are true?
- Expected correct: `0, 4, 7, 8`

Options:
0. The Rhine empties into the North Sea.
1. The Rhine flows through South America.
2. The Rhine begins in Iceland.
3. The Rhine runs through India.
4. The Rhine flows through western Europe.
5. The Rhine empties into the Black Sea.
6. The Rhine is Africa's longest river.
7. Rhine matters to German and Dutch trade.
8. The Rhine is one of Europe's major rivers.
9. The Rhine is Australia's capital river.

### EN-03

- Bucket: `priority_open`
- Card: `culture-open-020`
- Topic/category: `Culture/OPEN`
- Question: Culture: Which statements about Van Gogh are true?
- Expected correct: `0, 4, 8, 9`

Options:
0. Van Gogh was a painter.
1. Van Gogh was a Roman senator.
2. Van Gogh was a novelist.
3. He wrote Macbeth.
4. Van Gogh was Dutch.
5. Van Gogh came from Portugal.
6. He directed Citizen Kane.
7. He composed The Magic Flute.
8. Sunflowers is linked to Van Gogh.
9. Starry Night is one of his famous works.

### EN-04

- Bucket: `priority_open`
- Card: `science-open-010`
- Topic/category: `Science/OPEN`
- Question: Science: Which statements about momentum are true?
- Expected correct: `0, 1, 2, 6`

Options:
0. A moving truck has momentum.
1. Momentum is a physics concept.
2. Momentum is conserved in isolated systems.
3. Still objects do not have huge momentum.
4. Momentum is a style of poetry.
5. Momentum is measured in degrees Celsius.
6. Momentum depends on mass and velocity.
7. Momentum is a chemical reaction only.
8. Momentum exists only in liquids.
9. Momentum is a planet ring.

### EN-05

- Bucket: `priority_open`
- Card: `varia-open-029`
- Topic/category: `Varia/OPEN`
- Question: Varia: Which statements about a camera are true?
- Expected correct: `4, 6, 8, 9`

Options:
0. A camera only works underground.
1. A camera is a kind of sandwich.
2. A camera is a type of volcano.
3. A camera is a bird species.
4. Cameras can take photos or video.
5. A camera is used to boil tea.
6. A camera captures images.
7. A camera is made only of paper.
8. Many cameras use lenses.
9. Smartphones often include cameras.

### EN-06

- Bucket: `cross_category`
- Card: `history-true_false-030`
- Topic/category: `History/TRUE_FALSE`
- Question: History: Which statements about the Maya civilization are true?
- Expected correct: `0, 1, 2, 3, 7`

Options:
0. Maya cities rose in Mesoamerica.
1. Maya writing used glyphs.
2. They tracked time with complex calendars.
3. Chichen Itza is tied to Maya history.
4. Maya civilization centered in Scandinavia.
5. Steel railways built their empire.
6. They landed on the Moon.
7. Maize was central to Maya life.
8. Maya used only Latin script.
9. Their cities vanished in one night.

### EN-07

- Bucket: `cross_category`
- Card: `sports-number-024`
- Topic/category: `Sports/NUMBER`
- Question: Sports: Minutes in one football half?
- Expected correct: `4`

Options:
0. 50
1. 40
2. 37
3. 53
4. 45
5. 43
6. 35
7. 55
8. 57
9. 47

### EN-08

- Bucket: `cross_category`
- Card: `geography-order-022`
- Topic/category: `Geography/ORDER`
- Question: Geography: Put these countries in order by area, smallest first.
- Expected correct: `7, 5, 1, 10, 2, 4, 8, 3, 6, 9`

Options:
0. Kazakhstan
1. India
2. Iceland
3. Russia
4. United Kingdom
5. Ukraine
6. China
7. France
8. Argentina
9. Canada

### EN-09

- Bucket: `cross_category`
- Card: `culture-century_decade-007`
- Topic/category: `Culture/CENTURY_DECADE`
- Question: Culture: Which decade includes 1647?
- Expected correct: `6`

Options:
0. 1600s
1. 1660s
2. 1650s
3. 1610s
4. 1690s
5. 1630s
6. 1640s
7. 1670s
8. 1620s
9. 1680s

### EN-10

- Bucket: `cross_category`
- Card: `science-color-015`
- Topic/category: `Science/COLOR`
- Question: Science: Which hue belongs with 'silver coin'?
- Expected correct: `7`

Options:
0. Navy
1. White
2. Gold
3. Mint Green
4. Orange
5. Black
6. Green
7. Silver
8. Gray
9. Blue

## ET Sample

### ET-01

- Bucket: `priority_open`
- Card: `sports-open-023-et`
- Topic/category: `Sports/OPEN`
- Question: Sport: Millised väited maratoni kohta peavad paika?
- Expected correct: `0, 5, 8, 9`

Options:
0. Olümpiamängudel on maraton kavas.
1. Maratonis on kriketi väravad ja over'id.
2. Maratoni mängitakse golfikeppidega.
3. Maraton on seitsmemänguline finaalseeria.
4. Maratonis kasutatakse jääl litrit.
5. Maraton on maanteejooksu ala.
6. Maratoni ujutakse basseinis.
7. Rajal peab olema üle tee tõmmatud võrk.
8. Maratoni pikkus on 42,195 km.
9. Maratoni nimi pärineb antiik-Kreekast.

### ET-02

- Bucket: `priority_open`
- Card: `geography-open-006-et`
- Topic/category: `Geography/OPEN`
- Question: Geograafia: Millised väited Oslo kohta peavad paika?
- Expected correct: `0, 2, 4, 9`

Options:
0. Oslo on Norra pealinn.
1. Oslo paikneb Vaikse ookeani ääres.
2. Oslo asub Oslo fjordi ääres.
3. Oslo on Islandi pealinn.
4. Oslo on Skandinaavias.
5. Oslo asub Doonau ääres.
6. Oslo on Taani pealinn.
7. Oslo on Lõuna-Aafrikas.
8. Oslo on Läänemere rannikul.
9. Oslo on Põhjamaa pealinn.

### ET-03

- Bucket: `priority_open`
- Card: `culture-open-026-et`
- Topic/category: `Culture/OPEN`
- Question: Kultuur: Millised väited Dostojevski kohta peavad paika?
- Expected correct: `0, 5, 8, 9`

Options:
0. The Brothers Karamazov on tema teos.
1. Dostojevski maalis Sixtuse kabeli lae.
2. Ta juhtis The Beatlesit.
3. Dostojevski oli Hollywoodi monteerija.
4. Ta kirjutas Pride and Prejudice'i.
5. Crime and Punishment on Dostojevski teos.
6. Dostojevski kavandas Eiffeli torni.
7. Dostojevski sündis Mexico Citys.
8. Dostojevski oli romaanikirjanik.
9. Dostojevski kuulub vene kirjandusse.

### ET-04

- Bucket: `priority_open`
- Card: `science-open-010-et`
- Topic/category: `Science/OPEN`
- Question: Teadus: Millised väited impulsi kohta peavad paika?
- Expected correct: `0, 6, 7, 8`

Options:
0. Impulss on füüsika mõiste.
1. Impulss eksisteerib vaid vedelikes.
2. Impulss on ainult keemiline reaktsioon.
3. Paigal kehal on alati hiiglaslik impulss.
4. Impulss on luulestiil.
5. Impulssi mõõdetakse Celsiuse kraadides.
6. Impulss sõltub massist ja kiirusest.
7. Isolatsioonis süsteemis impulss säilib.
8. Liikuval veokil on impulss.
9. Impulss on planeedirõngas.

### ET-05

- Bucket: `priority_open`
- Card: `varia-open-001-et`
- Topic/category: `Varia/OPEN`
- Question: Varia: Millised väited kalendri kohta peavad paika?
- Expected correct: `0, 1, 4, 9`

Options:
0. Kalender aitab kuupäevi jälgida.
1. Kalender aitab sündmusi planeerida.
2. Kalender ajab vee keema.
3. Kalender on muusikainstrument.
4. Kalendris on kuud ja nädalad.
5. Kalender on alati söödav.
6. Kalender on jalgratta liik.
7. Kalendrit kasutatakse puidu lõikamiseks.
8. Kalender on linnuliik.
9. Paljud kalendrid märgivad pühi.

### ET-06

- Bucket: `cross_category`
- Card: `history-true_false-028-et`
- Topic/category: `History/TRUE_FALSE`
- Question: Ajalugu: Millised väited Pax Romana kohta peavad paika?
- Expected correct: `0, 1, 2, 3, 7`

Options:
0. Pax Romana tähendab Rooma rahu.
1. See algas Augustuse ajal.
2. Kaubandus ja teed õitsesid siis.
3. Impeerium püsis üldiselt stabiilne.
4. See algas pärast Rooma langemist.
5. See oli Jaapani šogunaat.
6. Hannibal valitses Pax Romana ajal.
7. See kuulus Rooma keisririiki.
8. See lõppes enne Caesari sündi.
9. Gladiaatorid leiutasid siis püssirohu.

### ET-07

- Bucket: `cross_category`
- Card: `sports-number-028-et`
- Topic/category: `Sports/NUMBER`
- Question: Sport: Mitu setti on vaja meeste Grand Slami voitmiseks?
- Expected correct: `6`

Options:
0. 2
1. 7
2. 27
3. 5
4. 6
5. 25
6. 3
7. 4
8. 8
9. 1

### ET-08

- Bucket: `cross_category`
- Card: `geography-order-014-et`
- Topic/category: `Geography/ORDER`
- Question: Geograafia: Pane need linnad lõunast põhja järjekorda.
- Expected correct: `4, 2, 8, 5, 9, 7, 1, 3, 10, 6`

Options:
0. Nairobi
1. Kaplinn
2. Pariis
3. Singapur
4. Stockholm
5. Ateena
6. Canberra
7. Buenos Aires
8. Reykjavik
9. Kairo

### ET-09

- Bucket: `cross_category`
- Card: `culture-century_decade-011-et`
- Topic/category: `Culture/CENTURY_DECADE`
- Question: Kultuur: Vali kumnend aasta jaoks 1675.
- Expected correct: `6`

Options:
0. 1630s
1. 1660s
2. 1690s
3. 1680s
4. 1640s
5. 1700s
6. 1670s
7. 1650s
8. 1710s
9. 1720s

### ET-10

- Bucket: `cross_category`
- Card: `science-color-029-et`
- Topic/category: `Science/COLOR`
- Question: Teadus: Mis värvile jääksid pidama vihje 'kuldmedal' puhul?
- Expected correct: `6`

Options:
0. Mündiroheline
1. Sinine
2. Roheline
3. Hall
4. Punane
5. Oranž
6. Kuldne
7. Tumesinine
8. Pruun
9. Hõbedane

