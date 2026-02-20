#!/usr/bin/env python3
import json
import re
from pathlib import Path

INPUT_PATH = Path("data/smart10/cards.et.json")

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

REPLACEMENTS = [
    ("Mark statements that are true for this topic.", "Margi selle teema toesed vaited."),
    ("Which claims are accurate?", "Millised vaited on oiged?"),
    ("Find the statements that fit.", "Leia sobivad vaited."),
    ("Select all true statements.", "Vali koik toed vaited."),
    ("Which lines are correct?", "Millised read on oiged?"),
    ("Identify valid statements.", "Tuvasta kehtivad vaited."),
    ("Select statements that are true.", "Vali tõesed vaited."),
    ("Which statements are correct?", "Millised vaited on oiged?"),
    ("Pick all true statements.", "Vali koik tõesed vaited."),
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


def localize_century_decade_option(value: str) -> str:
    text = str(value)
    match = re.fullmatch(r"(\d+)(st|nd|rd|th) century", text)
    if match:
        return f"{match.group(1)}. sajand"
    return text


def main() -> None:
    raw = INPUT_PATH.read_text(encoding="utf-8")
    cards = json.loads(raw)
    if not isinstance(cards, list):
        raise SystemExit("cards.et.json must be a JSON array")

    for card in cards:
        card["question"] = localize_question(card.get("question", ""))
        category = str(card.get("category", "")).upper()
        options = card.get("options", [])
        if not isinstance(options, list):
            continue

        if category == "COLOR":
            card["options"] = [COLOR_MAP.get(str(option), str(option)) for option in options]
        elif category == "CENTURY_DECADE":
            card["options"] = [localize_century_decade_option(str(option)) for option in options]

    INPUT_PATH.write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Localized {len(cards)} ET cards in {INPUT_PATH}")


if __name__ == "__main__":
    main()
