#!/usr/bin/env python3
import json
import re
from pathlib import Path

INPUT_PATH = Path("data/smart10/cards.et.json")
OVERRIDES_PATH = Path("data/smart10/et.localization.overrides.json")

TOPIC_LABELS = {
    "History": "Ajalugu",
    "Sports": "Sport",
    "Geography": "Geograafia",
    "Culture": "Kultuur",
    "Science": "Teadus",
    "Varia": "Varia",
}

COLOR_MAP = {
    "Red": "Punane",
    "Blue": "Sinine",
    "Green": "Roheline",
    "Yellow": "Kollane",
    "Orange": "Oranz",
    "Purple": "Lilla",
    "Pink": "Roosa",
    "Black": "Must",
    "White": "Valge",
    "Brown": "Pruun",
    "Gray": "Hall",
    "Navy": "Tumesinine",
    "Mint": "Mint",
    "Gold": "Kuldne",
    "Silver": "Hobe",
}

CLUE_MAP = {
    "clear daytime sky": "selge paevane taevas",
    "fresh grass": "varske rohi",
    "ripe banana peel": "kups banaanikoor",
    "ripe tomato": "kups tomat",
    "new snow": "uus lumi",
    "charcoal": "susi",
    "pumpkin skin": "korvitsa koor",
    "lavender flower": "lavendli ois",
    "strawberry ice cream": "maasikajaatis",
    "cocoa powder": "kakaopulber",
    "storm cloud": "tormipilv",
    "deep ocean at night": "ookean ooajal",
    "mint leaf": "mundi leht",
    "gold medal": "kuldmedal",
    "silver coin": "hobemunt",
}

STATEMENT_MAP = {
    "A hat trick means three goals.": "Hat trick tahendab kolme varavat.",
    "A week has nine days.": "Nadalas on uheksa paeva.",
    "A week has seven days.": "Nadalas on seitse paeva.",
    "Airport is only for trains.": "Lennujaam on ainult rongidele.",
    "Airport serves air travel.": "Lennujaam teenindab lennureise.",
    "Andes are in Africa.": "Andid on Aafrikas.",
    "Andes are in South America.": "Andid on Louna-Ameerikas.",
    "Apollo 11 landed in 1959.": "Apollo 11 maandus 1959. aastal.",
    "Apollo 11 landed in 1969.": "Apollo 11 maandus 1969. aastal.",
    "Atlantic is the largest ocean.": "Atlandi ookean on suurim ookean.",
    "Atoms have a nucleus.": "Aatomitel on tuum.",
    "Atoms have no protons.": "Aatomitel ei ole prootoneid.",
    "Ballet is a dance form.": "Ballett on tantsuvorm.",
    "Ballet is a martial art.": "Ballett on voitluskunst.",
    "Basketball has no hoops.": "Korvpallis pole korvi.",
    "Basketball uses a hoop.": "Korvpallis kasutatakse korvi.",
    "Beatles formed in Liverpool.": "Beatles loodi Liverpoolis.",
    "Beatles formed in Tokyo.": "Beatles loodi Tokyos.",
    "Beethoven wrote no music.": "Beethoven ei kirjutanud muusikat.",
    "Beethoven wrote symphonies.": "Beethoven kirjutas suumfooniaid.",
    "Berlin Wall fell in 1973.": "Berliini muur langes 1973. aastal.",
    "Berlin Wall fell in 1989.": "Berliini muur langes 1989. aastal.",
    "Byzantium centered in Constantinople.": "Bytsantsi keskuseks oli Konstantinoopol.",
    "Byzantium was centered in Madrid.": "Bytsantsi keskuseks oli Madrid.",
    "Caesar was killed in 144 BC.": "Caesar tapeti 144 eKr.",
    "Caesar was killed in 44 BC.": "Caesar tapeti 44 eKr.",
    "Canberra is Australia's capital.": "Canberra on Austraalia pealinn.",
    "Canberra is in New Zealand.": "Canberra asub Uus-Meremaal.",
    "Cinema predates photography.": "Kino eelnes fotograafiale.",
    "Cinema uses moving images.": "Kino kasutab liikuvaid pilte.",
    "Clock shows time.": "Kell naitab aega.",
    "Clock writes emails.": "Kell kirjutab e-kirju.",
    "Coffee contains caffeine.": "Kohv sisaldab kofeiini.",
    "Coffee is made from plastic.": "Kohv on tehtud plastist.",
    "Cold War followed World War II.": "Kulm soda jargnes Teisele maailmasojale.",
    "Cold War started before WWI.": "Kulm soda algas enne Esimest maailmasoda.",
    "Compass measures temperature.": "Kompass moodab temperatuuri.",
    "Compass points north.": "Kompass naitab pohja.",
    "Cricket has no bat.": "Kriketis ei kasutata kurikat.",
    "Cricket uses wickets.": "Kriketis kasutatakse wickets'eid.",
    "DNA carries genetic information.": "DNA kannab geneetilist infot.",
    "DNA stores photos.": "DNA salvestab fotosid.",
    "Danube flows through Australia.": "Doonau voolab labi Austraalia.",
    "Danube flows through Europe.": "Doonau voolab labi Euroopa.",
    "Earth orbits the Sun.": "Maa tiirleb umber Paikese.",
    "Electrons are positively charged.": "Elektronid on positiivse laenguga.",
    "Electrons have negative charge.": "Elektronidel on negatiivne laeng.",
    "Everest is in the Alps.": "Everest asub Alpides.",
    "Free throw is from baseball.": "Vabavise kuulub pesapalli.",
    "Free throw is from basketball.": "Vabavise kuulub korvpalli.",
    "Gravity attracts mass.": "Gravitatsioon tombab masse.",
    "Gravity repels all mass.": "Gravitatsioon toukab koiki masse.",
    "Greenland is mostly ice-covered.": "Groonimaa on valdavalt jaaga kaetud.",
    "Greenland is near equator.": "Groonimaa asub ekvaatori lahedal.",
    "Hat trick means five goals.": "Hat trick tahendab viit varavat.",
    "Himalayas include Mount Everest.": "Himaalaja hulka kuulub Mount Everest.",
    "Iceland is an island nation.": "Island on saareriik.",
    "Iceland is in the tropics.": "Island asub troopikas.",
    "Jazz began in medieval France.": "Jazz algas keskaja Prantsusmaal.",
    "Jazz began in the United States.": "Jazz algas Ameerika Uhendriikides.",
    "Keyboard is a cooking tool.": "Klaviatuur on tooriist toiduvalmistamiseks.",
    "Keyboard is an input device.": "Klaviatuur on sisendseade.",
    "Libraries sell cars.": "Raamatukogud muuvad autosid.",
    "Library lends books.": "Raamatukogu laenutab raamatuid.",
    "Lisbon is in Portugal.": "Lissabon asub Portugalis.",
    "Lisbon is in Spain.": "Lissabon asub Hispaanias.",
    "Magna Carta was signed in 1215.": "Magna Carta allkirjastati 1215. aastal.",
    "Magna Carta was signed in 1512.": "Magna Carta allkirjastati 1512. aastal.",
    "Marathon length is 12 km.": "Maratoni pikkus on 12 km.",
    "Marathon length is 42.195 km.": "Maratoni pikkus on 42,195 km.",
    "Mars is called the Red Planet.": "Marsi kutsutakse Punaseks planeediks.",
    "Mars is the hottest planet.": "Marss on koige kuumem planeet.",
    "Mona Lisa is a painting.": "Mona Lisa on maal.",
    "Mona Lisa is a sculpture.": "Mona Lisa on skulptuur.",
    "Mozart was a composer.": "Mozart oli helilooja.",
    "Mozart was a film director.": "Mozart oli filmirezhissoor.",
    "Napoleon lost at Waterloo.": "Napoleon kaotas Waterloos.",
    "Napoleon won at Waterloo.": "Napoleon voitis Waterloos.",
    "Neurons are only in plants.": "Neuronid on ainult taimedes.",
    "Neurons transmit signals.": "Neuronid edastavad signaale.",
    "Nile flows through Brazil.": "Niilus voolab labi Brasiilia.",
    "Nile flows through Egypt.": "Niilus voolab labi Egiptuse.",
    "Offside is a football rule.": "Suluseis on jalgpalli reegel.",
    "Offside is a tennis rule.": "Suluseis on tennise reegel.",
    "Olympics are held every four years.": "Olumpiamangud toimuvad iga nelja aasta tagant.",
    "Olympics happen every year.": "Olumpiamangud toimuvad igal aastal.",
    "Opera combines music and drama.": "Ooper uhendab muusikat ja draamat.",
    "Opera has no singing.": "Ooperis ei laulda.",
    "Ottawa is Canada's capital.": "Ottawa on Kanada pealinn.",
    "Ottawa is US capital.": "Ottawa on USA pealinn.",
    "Oxygen cannot support fire.": "Hapnik ei toeta polemist.",
    "Oxygen supports combustion.": "Hapnik toetab polemist.",
    "Pacific is the largest ocean.": "Vaikne ookean on suurim ookean.",
    "Passport is a house key.": "Pass on kodu voti.",
    "Passport is travel ID.": "Pass on reisidokument.",
    "Picasso painted Guernica.": "Picasso maalis Guernica.",
    "Picasso painted The Scream.": "Picasso maalis Karje.",
    "Plants grow without sunlight.": "Taimed kasvavad ilma paikesevalguseta.",
    "Plants use photosynthesis.": "Taimed kasutavad fotosunteesi.",
    "Printing press spread in 1400s.": "Trukipress levis 1400ndatel.",
    "Printing press spread in 1700s.": "Trukipress levis 1700ndatel.",
    "Recipe is a tax document.": "Retsept on maksudokument.",
    "Recipe lists ingredients.": "Retsept loetleb koostisosi.",
    "Renaissance began in Australia.": "Renessanss algas Austraalias.",
    "Renaissance began in Italy.": "Renessanss algas Itaalias.",
    "Roman Empire came before Republic.": "Rooma impeerium tuli enne vabariiki.",
    "Roman Republic came before Empire.": "Rooma vabariik tuli enne impeeriumi.",
    "Rugby uses a ping-pong ball.": "Ragbis kasutatakse lauatennisepalli.",
    "Rugby uses an oval ball.": "Ragbis kasutatakse ovaalset palli.",
    "Sahara is a desert.": "Sahara on korb.",
    "Sahara is a rainforest.": "Sahara on vihmamets.",
    "Shakespeare wrote Don Quixote.": "Shakespeare kirjutas Don Quijote.",
    "Shakespeare wrote Hamlet.": "Shakespeare kirjutas Hamleti.",
    "Sound travels faster than light.": "Heli levib kiiremini kui valgus.",
    "Sound travels slower than light.": "Heli levib aeglasemalt kui valgus.",
    "Stanley Cup is for basketball.": "Stanley karikas on korvpallile.",
    "Stanley Cup is for ice hockey.": "Stanley karikas on jaahokile.",
    "Sun orbits the Earth.": "Paike tiirleb umber Maa.",
    "Tennis can be played on clay.": "Tennist saab mangida savivaljakul.",
    "Tennis is only indoor sport.": "Tennis on ainult siseala.",
    "The Odyssey is a modern novel.": "Odusseia on modernne romaan.",
    "The Odyssey is an epic poem.": "Odusseia on eepiline poeem.",
    "Ticket can grant entry.": "Pilet voib anda sissepaasu.",
    "Ticket is always free money.": "Pilet on alati tasuta raha.",
    "Tokyo is in Japan.": "Tokyo asub Jaapanis.",
    "Tokyo is in South Korea.": "Tokyo asub Louna-Koreas.",
    "Tour de France is a cycling race.": "Tour de France on rattasoidu voistlus.",
    "Tour de France is a swim race.": "Tour de France on ujumisvoistlus.",
    "USSR dissolved in 1961.": "NSVL lagunes 1961. aastal.",
    "USSR dissolved in 1991.": "NSVL lagunes 1991. aastal.",
    "Umbrella helps in rain.": "Vihmavari aitab vihmaga.",
    "Umbrella is for underwater use.": "Vihmavari on vee all kasutamiseks.",
    "Van Gogh painted Starry Night.": "Van Gogh maalis Tahelise oo.",
    "Van Gogh painted The Last Supper.": "Van Gogh maalis Viimse ohtusooja.",
    "WWII ended in 1939.": "Teine maailmasoda loppes 1939. aastal.",
    "WWII ended in 1945.": "Teine maailmasoda loppes 1945. aastal.",
    "Wallet holds cash or cards.": "Rahakott hoiab sularaha voi kaarte.",
    "Wallet is footwear.": "Rahakott on jalats.",
    "Water boils at 100C.": "Vesi keeb 100C juures.",
    "Water boils at 10C.": "Vesi keeb 10C juures.",
    "Water is CO2.": "Vesi on CO2.",
    "Water is H2O.": "Vesi on H2O.",
    "Wimbledon is a golf major.": "Wimbledon on golfi suurturniir.",
    "Wimbledon is a tennis tournament.": "Wimbledon on tenniseturniir.",
}

REPLACEMENTS = [
    ("Mark statements that are true for this topic.", "Margi selle teema toesed vaited."),
    ("Which claims are accurate?", "Millised vaited on oiged?"),
    ("Find the statements that fit.", "Leia sobivad vaited."),
    ("Select all true statements.", "Vali koik toesed vaited."),
    ("Vali koik toed vaited.", "Vali koik toesed vaited."),
    ("Which lines are correct?", "Millised read on oiged?"),
    ("Identify valid statements.", "Tuvasta kehtivad vaited."),
    ("Select statements that are true.", "Vali toesed vaited."),
    ("Which statements are correct?", "Millised vaited on oiged?"),
    ("Pick all true statements.", "Vali koik toesed vaited."),
    ("Identify factual statements.", "Tuvasta faktivaided."),
    ("Which options are accurate?", "Millised variandid on oiged?"),
    ("Select all valid statements.", "Vali koik kehtivad vaited."),
    ("Focus area:", "Fookus:"),
    ("Context tag:", "Kontekst:"),
    ("Theme:", "Teema:"),
    ("Topic clue:", "Teemavihe:"),
    ("Order earliest to latest.", "Jarjesta varaseimast hiliseimani."),
    ("Order release year, oldest first.", "Jarjesta valjalaskeaastad vanimast uuemani."),
    ("Order rulers by reign start.", "Jarjesta valitsejad valitsusaja alguse jargi."),
    ("Order battles by year.", "Jarjesta lahingud aasta jargi."),
    ("Order treaties by signing year.", "Jarjesta lepingud allkirjastamise aasta jargi."),
    ("Order empires by start year.", "Jarjesta impeeriumid algusaasta jargi."),
    ("Order city latitude south to north.", "Jarjesta linnad laiuskraadi jargi lounast pohja."),
    ("Order countries by area, small to large.", "Jarjesta riigid pindala jargi vaikesest suureni."),
    ("Order mountain heights, low to high.", "Jarjesta marged korguse jargi madalast korgeni."),
    ("Order publication year, oldest first.", "Jarjesta avaldamisaastad vanimast uuemani."),
    ("Order art periods earliest to latest.", "Jarjesta kunstiajastud varaseimast hiliseimani."),
    ("Order literary periods by start.", "Jarjesta kirjandusajastud alguse jargi."),
    ("Order planets from Sun outward.", "Jarjesta planeedid Paikesest valjapoole."),
    ("Order SI prefixes from small to large.", "Jarjesta SI eesliited vaikesest suureni."),
    ("Order data units from byte upward.", "Jarjesta andmeuhikud baidist suuremani."),
    ("Order weekdays from Monday.", "Jarjesta nadalapaevad alates esmaspaevast."),
    ("Order months from January.", "Jarjesta kuud alates jaanuarist."),
    ("Use strict ascending order.", "Kasuta rangelt kasvavat jarjekorda."),
    ("Place earliest/lowest at rank 1.", "Pane varaseim/madalaim kohale 1."),
    ("Build one correct sequence.", "Koosta uks korrektne jarjestus."),
    ("Rank all options from first to last.", "Jarjesta koik variandid esimesest viimaseni."),
    ("Do not skip any rank.", "Ara jata uhtegi kohta vahele."),
    ("Each rank is used exactly once.", "Igat kohta kasutatakse tapselt korra."),
    ("Which decade includes", "Millisesse kumnendisse kuulub"),
    ("Pick the decade for", "Vali kumnend aasta jaoks"),
    ("falls in which decade?", "kuulub millisesse kumnendisse?"),
    ("In which century is", "Mis sajandisse kuulub"),
    ("Choose the century that contains", "Vali sajand, kuhu kuulub"),
    ("falls in which century?", "kuulub millisesse sajandisse?"),
    ("Which color matches", "Milline varv sobib"),
    ("Pick the color best matching", "Vali varv, mis sobib koige paremini"),
    ("Select the color for", "Vali varv vihjele"),
    ("is closest to which color?", "on koige lahedasem millisele varvile?"),
    ("Which option names the right color for", "Milline variant nimetab oige varvi vihjele"),
    ("Choose the color cue:", "Vali varvivihje:"),
    ("In which year did WWII end?", "Mis aastal loppes Teine maailmasoda?"),
    ("In which year did Berlin Wall fall?", "Mis aastal langes Berliini muur?"),
    ("In which year did Apollo 11 land?", "Mis aastal maandus Apollo 11?"),
    ("In which year was Magna Carta signed?", "Mis aastal allkirjastati Magna Carta?"),
    ("In which year did USSR dissolve?", "Mis aastal lagunes NSVL?"),
    ("In which year did WWI start?", "Mis aastal algas Esimene maailmasoda?"),
    ("Players on football team on field?", "Mitu mangijat on jalgpallitiimis valjakul?"),
    ("Points for a basketball free throw?", "Mitu punkti annab korvpalli vabavise?"),
    ("Holes in a standard golf round?", "Mitu rada on tavalises golfiringis?"),
    ("Sets to win men's Grand Slam match?", "Mitu setti on vaja meeste Grand Slami voitmiseks?"),
    ("Distance of marathon in kilometers?", "Mis on maratoni pikkus kilomeetrites?"),
    ("Minutes in one football half?", "Mitu minutit kestab uks jalgpalli poolaeg?"),
    ("How many US states are there?", "Mitu osariiki on USA-s?"),
    ("How many continents are commonly listed?", "Mitu mandrit loetletakse tavaliselt?"),
    ("How many countries are in the EU (2026)?", "Mitu riiki on EL-is (2026)?"),
    ("How many oceans are commonly named?", "Mitu ookeani nimetatakse tavaliselt?"),
    ("How many time zones does China use?", "Mitut ajatsooni Hiina kasutab?"),
    ("How many degrees in a full circle?", "Mitu kraadi on taisringis?"),
    ("How many Harry Potter books exist?", "Mitu Harry Potteri raamatut on olemas?"),
    ("How many strings on a violin?", "Mitu keelt on viiulil?"),
    ("How many lines in a Shakespeare sonnet?", "Mitu rida on Shakespeare'i sonetis?"),
    ("How many books in LOTR trilogy?", "Mitu raamatut on Sormuste Isanda triloogias?"),
    ("How many acts in a classical drama?", "Mitu vaatust on klassikalises draamas?"),
    ("How many Oscars in EGOT acronym?", "Mitu Oscarit on EGOT lyhendis?"),
    ("How many planets in Solar System?", "Mitu planeeti on Paikesesusteemis?"),
    ("How many DNA bases are canonical?", "Mitu kanoonilist DNA alust on?"),
    ("How many elements in periodic table?", "Mitu elementi on perioodilisustabelis?"),
    ("How many protons does carbon have?", "Mitu prootonit on sasinikul?"),
    ("How many bones in adult human body?", "Mitu luud on taiskasvanud inimese kehas?"),
    ("How many days in one week?", "Mitu paeva on uhes nadalas?"),
    ("How many days in leap year?", "Mitu paeva on liigaaastas?"),
    ("How many months in one year?", "Mitu kuud on uhes aastas?"),
    ("How many minutes in one hour?", "Mitu minutit on uhes tunnis?"),
    ("How many minutes in one day?", "Mitu minutit on uhes paevas?"),
    ("How many hours in one day?", "Mitu tundi on uhes paevas?"),
    ("How many letters in English alphabet?", "Mitu tahte on inglise tahestikus?"),
]


def localize_question(question: str) -> str:
    text = str(question)
    for topic_en, topic_et in TOPIC_LABELS.items():
        text = re.sub(rf"^{re.escape(topic_en)}:", f"{topic_et}:", text)
    for source, target in REPLACEMENTS:
        text = text.replace(source, target)
    for source, target in CLUE_MAP.items():
        text = text.replace(f"'{source}'", f"'{target}'")
    return text


def anchor_id_from_card_id(card_id: str) -> str:
    match = re.search(r"-(\d{3})(?:-et)?$", str(card_id))
    if not match:
        return "000"
    return match.group(1)


def localize_anchor_slots(question: str, card_id: str) -> str:
    anchor_no = anchor_id_from_card_id(card_id)
    text = str(question)
    for marker in ("Fookus:", "Kontekst:", "Teema:", "Teemavihe:"):
        text = re.sub(
            rf"{re.escape(marker)}\s*[^.]+(\.)",
            f"{marker} kaart {anchor_no}\\1",
            text,
        )
    return text


def localize_century_decade_option(value: str) -> str:
    text = str(value)
    match = re.fullmatch(r"(\d+)(st|nd|rd|th) century", text)
    if match:
        return f"{match.group(1)}. sajand"
    return text


def clamp_option(value: str, limit: int = 42) -> str:
    text = " ".join(str(value).split())
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


ORDER_OPTION_PHRASE_MAP = {
    "Basketball quarter": "Korvpalli veerandaeg",
    "Football half": "Jalgpalli poolaeg",
    "Tennis set": "Tennise sett",
    "Baseball inning": "Pesapalli voor",
    "Rugby half": "Ragbi poolaeg",
    "Volleyball set": "Vorkpalli sett",
    "Handball half": "Kasipalli poolaeg",
    "Hockey period": "Hoki periood",
    "Cricket T20 match": "Kriketi T20 matsh",
    "Test cricket day": "Testkriketi paev",
    "1 cent": "1 sent",
    "10 cents": "10 senti",
    "50 cents": "50 senti",
    "Half marathon": "Poolmaraton",
    "World cup": "MM",
    "World war i": "Esimene maailmasoda",
    "World war ii": "Teine maailmasoda",
    "World soda i": "Esimene maailmasoda",
    "World soda ii": "Teine maailmasoda",
    "Wwi begins": "Esimene maailmasoda algab",
    "Wwii begins": "Teine maailmasoda algab",
    "Wwii ends": "Teine maailmasoda lopp",
    "Cold war": "Kulm soda",
    "Cold soda": "Kulm soda",
    "Berlin wall falls": "Berliini muur langeb",
    "Ussr dissolves": "NSVL laguneb",
    "Apollo 11 landing": "Apollo 11 maandumine",
    "Magna carta signed": "Magna Carta allkirjastatud",
    "Battle of waterloo": "Waterloo lahing",
    "Columbus reaches americas": "Columbus jouab Ameerikasse",
    "French revolution starts": "Prantsuse revolutsioon algab",
    "Poolaeg marathon": "Poolmaraton",
    "Industrial revolution": "Toostusrevolutsioon",
    "Middle ages": "Keskaeg",
    "Classical antiquity": "Klassikaline antiik",
    "Renaissance literature": "Renessansi kirjandus",
    "Enlightenment writing": "Valgustusajastu kirjandus",
    "Contemporary fiction": "Nuudiskirjandus",
    "Epic poetry age": "Eepika ajastu",
    "Classical art": "Klassikaline kunst",
    "Medieval art": "Keskaegne kunst",
    "Baroque": "Barokk",
    "Impressionism": "Impressionism",
    "Cubism": "Kubism",
    "Surrealism": "Surrealism",
    "Pop art": "Popkunst",
    "Football": "Jalgpall",
    "Basketball": "Korvpall",
    "Baseball": "Pesapall",
    "Baseball game": "Pesapallimang",
    "Cricket": "Kriket",
    "Volleyball": "Vorkpall",
    "Beach volleyball": "Rannavorkpall",
    "Water polo": "Veepall",
    "Rugby union": "Ragbi",
    "Table tennis rally": "Lauatennise pallivahetus",
    "Tennis singles": "Tennise uksikmang",
    "Aussie rules football": "Austraalia jalgpall",
    "Year": "Aasta",
    "Month": "Kuu",
    "Week": "Nadal",
    "Day": "Paev",
    "Hour": "Tund",
    "Minute": "Minut",
    "Second": "Sekund",
    "Base unit": "Baasuhik",
    "United kingdom": "Uhendkuningriik",
    "Jupiter": "Jupiter",
    "Saturn": "Saturn",
    "Uranus": "Uraan",
    "Neptune": "Neptuun",
}

ORDER_WORD_MAP = {
    "quarter": "veerandaeg",
    "half": "poolaeg",
    "set": "sett",
    "inning": "voor",
    "period": "periood",
    "match": "matsh",
    "day": "paev",
    "age": "ajastu",
    "era": "ajastu",
    "dynasty": "dunastia",
    "run": "jooks",
    "race": "voistlus",
    "dollar": "dollar",
    "cents": "senti",
    "cent": "sent",
    "byte": "bait",
    "kilobyte": "kilobait",
    "megabyte": "megabait",
    "gigabyte": "gigabait",
    "terabyte": "terabait",
    "petabyte": "petabait",
    "exabyte": "eksabait",
    "zettabyte": "zettabait",
}

ORDER_OPTION_PHRASE_MAP_LOWER = {k.lower(): v for k, v in ORDER_OPTION_PHRASE_MAP.items()}

CLEANUP_REPLACEMENTS = [
    ("tõesed", "toesed"),
    ("suumfooniaid", "symfooniaid"),
    ("Kriketi t20 matsh", "Kriketi T20 mang"),
    ("Testkriketi paev", "Testkriketi mangupaev"),
    ("50km voistlus walk", "50 km kaimisvoistlus"),
    ("Viimse ohtusooja", "Viimse ohtusooja"),
]


def cleanup_text(value: str) -> str:
    text = str(value)
    for source, target in CLEANUP_REPLACEMENTS:
        text = text.replace(source, target)
    return text


def load_external_replacements() -> list[tuple[str, str]]:
    if not OVERRIDES_PATH.exists():
        return []
    parsed = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    items = parsed.get("replacements", [])
    pairs = []
    for entry in items:
        if not isinstance(entry, dict):
            continue
        source = str(entry.get("from", "")).strip()
        target = str(entry.get("to", "")).strip()
        if source and target:
            pairs.append((source, target))
    return pairs


def apply_external_replacements(value: str, replacements: list[tuple[str, str]]) -> str:
    text = str(value)
    for source, target in replacements:
        text = text.replace(source, target)
    return text


def localize_order_option(value: str) -> str:
    text = str(value).strip()
    if text in ORDER_OPTION_PHRASE_MAP:
        return ORDER_OPTION_PHRASE_MAP[text]
    lowered = text.lower()
    if lowered in ORDER_OPTION_PHRASE_MAP_LOWER:
        return ORDER_OPTION_PHRASE_MAP_LOWER[lowered]
    for source, target in ORDER_WORD_MAP.items():
        lowered = re.sub(rf"\b{re.escape(source)}\b", target, lowered)
    if lowered in ORDER_OPTION_PHRASE_MAP_LOWER:
        return ORDER_OPTION_PHRASE_MAP_LOWER[lowered]
    return lowered[:1].upper() + lowered[1:] if lowered else lowered


def main() -> None:
    raw = INPUT_PATH.read_text(encoding="utf-8")
    cards = json.loads(raw)
    if not isinstance(cards, list):
        raise SystemExit("cards.et.json must be a JSON array")
    external_replacements = load_external_replacements()

    for card in cards:
        card["question"] = localize_anchor_slots(
            localize_question(card.get("question", "")),
            str(card.get("cardId") or card.get("id") or ""),
        )
        card["question"] = cleanup_text(card["question"])
        card["question"] = apply_external_replacements(card["question"], external_replacements)
        category = str(card.get("category", "")).upper()
        options = card.get("options", [])
        if not isinstance(options, list):
            continue

        if category == "COLOR":
            card["options"] = [clamp_option(COLOR_MAP.get(str(option), str(option))) for option in options]
        elif category == "CENTURY_DECADE":
            card["options"] = [clamp_option(localize_century_decade_option(str(option))) for option in options]
        elif category in {"TRUE_FALSE", "OPEN"}:
            card["options"] = [clamp_option(STATEMENT_MAP.get(str(option), str(option))) for option in options]
        elif category == "ORDER":
            card["options"] = [clamp_option(localize_order_option(str(option))) for option in options]

        card["options"] = [cleanup_text(str(option)) for option in card["options"]]
        card["options"] = [apply_external_replacements(str(option), external_replacements) for option in card["options"]]

    INPUT_PATH.write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Localized {len(cards)} ET cards in {INPUT_PATH}")


if __name__ == "__main__":
    main()
