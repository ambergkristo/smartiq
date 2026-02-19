#!/usr/bin/env python3
import argparse
import json
import random
import re
from pathlib import Path

TOPICS = ["History", "Sports", "Geography", "Culture", "Science", "Technology"]
CATEGORIES = ["TRUE_FALSE", "NUMBER", "ORDER", "CENTURY_DECADE", "COLOR", "OPEN"]
LANGUAGE = "en"

# Core fact banks (short answer labels to fit peg UI)
OPEN_BANK = {
    "History": [
        ("Who was first U.S. president?", "George Washington"),
        ("What wall fell in 1989?", "Berlin Wall"),
        ("Who led India independence movement?", "Mahatma Gandhi"),
        ("Roman leader assassinated in 44 BCE?", "Julius Caesar"),
        ("Ship that sank in 1912?", "Titanic"),
        ("Who was known as Iron Lady?", "Margaret Thatcher"),
        ("Which empire built Machu Picchu?", "Inca Empire"),
        ("Who wrote Communist Manifesto with Marx?", "Friedrich Engels"),
        ("Which dynasty built most Great Wall?", "Ming"),
        ("Who painted Guernica?", "Pablo Picasso"),
        ("What year did WW2 end?", "1945"),
        ("Who discovered sea route to India in 1498?", "Vasco da Gama"),
        ("First man on the Moon?", "Neil Armstrong"),
        ("Leader of Soviet Union during Cuban Missile Crisis?", "Nikita Khrushchev"),
        ("Document signed in 1215 limiting king power?", "Magna Carta"),
    ],
    "Sports": [
        ("How many players in soccer team on field?", "11"),
        ("How many rings on Olympic flag?", "5"),
        ("Tennis term for zero points?", "Love"),
        ("Sport of Tour de France?", "Cycling"),
        ("Country that invented judo?", "Japan"),
        ("Basketball shot beyond arc is worth?", "3"),
        ("Number of holes in standard golf round?", "18"),
        ("NFL championship game name?", "Super Bowl"),
        ("Racquet sport with shuttlecock?", "Badminton"),
        ("Cricket over has how many balls?", "6"),
        ("How many sets to win men's Grand Slam final?", "3"),
        ("Country that hosted 2016 Summer Olympics?", "Brazil"),
        ("Sport using pommel horse?", "Gymnastics"),
        ("Maximum score in one ten-pin frame?", "30"),
        ("Position scoring touchdowns in American football often?", "Running back"),
    ],
    "Geography": [
        ("Capital of Australia?", "Canberra"),
        ("Longest river in Africa?", "Nile"),
        ("Largest ocean on Earth?", "Pacific"),
        ("Country with city of Marrakech?", "Morocco"),
        ("Mountain range with Everest?", "Himalayas"),
        ("Capital of Canada?", "Ottawa"),
        ("River through Paris?", "Seine"),
        ("Country shaped like a boot?", "Italy"),
        ("Desert in northern Africa?", "Sahara"),
        ("Largest island in world?", "Greenland"),
        ("Capital of Japan?", "Tokyo"),
        ("Sea between Europe and Africa?", "Mediterranean"),
        ("Country with most people in 2026?", "India"),
        ("Capital of Argentina?", "Buenos Aires"),
        ("U.S. state nicknamed Aloha State?", "Hawaii"),
    ],
    "Culture": [
        ("Who wrote Romeo and Juliet?", "William Shakespeare"),
        ("Museum housing Mona Lisa?", "Louvre"),
        ("Author of 1984?", "George Orwell"),
        ("Instrument with 88 keys?", "Piano"),
        ("Art style of Salvador Dali?", "Surrealism"),
        ("Film director of Jaws?", "Steven Spielberg"),
        ("Painter of Starry Night?", "Vincent van Gogh"),
        ("Japanese comic format?", "Manga"),
        ("Writer of The Odyssey?", "Homer"),
        ("Dance from Argentina famous worldwide?", "Tango"),
        ("Italian city of Renaissance art center?", "Florence"),
        ("Composer of Fifth Symphony short-short-short-long?", "Beethoven"),
        ("Novel featuring detective Sherlock Holmes creator?", "Arthur Conan Doyle"),
        ("Mexican painter known for self-portraits?", "Frida Kahlo"),
        ("Poem epic by Dante?", "Divine Comedy"),
    ],
    "Science": [
        ("Chemical symbol for gold?", "Au"),
        ("Closest planet to the Sun?", "Mercury"),
        ("Gas humans breathe in most for survival?", "Oxygen"),
        ("H2O common name?", "Water"),
        ("Force pulling objects toward Earth?", "Gravity"),
        ("Planet known as Red Planet?", "Mars"),
        ("Hardest natural substance?", "Diamond"),
        ("DNA stands for deoxyribonucleic what?", "Acid"),
        ("Center of an atom called?", "Nucleus"),
        ("Process plants use sunlight to make food?", "Photosynthesis"),
        ("Main gas in Earth's atmosphere?", "Nitrogen"),
        ("Number of bones in adult human body?", "206"),
        ("Speed of light unit abbreviation?", "m/s"),
        ("Branch of science about life?", "Biology"),
        ("Organ pumping blood?", "Heart"),
    ],
    "Technology": [
        ("What does CPU stand for?", "Central Processing Unit"),
        ("What does HTTP stand for?", "Hypertext Transfer Protocol"),
        ("File extension for JavaScript module?", ".js"),
        ("Company that created Windows OS?", "Microsoft"),
        ("Language primarily used for Android native apps today?", "Kotlin"),
        ("What does RAM stand for?", "Random Access Memory"),
        ("Version control system by Linus Torvalds?", "Git"),
        ("Protocol used to secure web traffic?", "HTTPS"),
        ("Database type of PostgreSQL?", "Relational"),
        ("Markup language for web pages?", "HTML"),
        ("Style language for web pages?", "CSS"),
        ("What does API stand for?", "Application Programming Interface"),
        ("Cloud provider with EC2?", "AWS"),
        ("Package manager bundled with Node.js?", "npm"),
        ("Open-source mobile OS by Google?", "Android"),
    ],
}

# TRUE/FALSE: each entry is (statement, truth)
TRUE_FALSE_BANK = {
    "History": [
        ("The Roman Empire fell before 1000 CE", True),
        ("World War I began in 1914", True),
        ("The Berlin Wall fell in 1989", True),
        ("Julius Caesar was a medieval king", False),
        ("The French Revolution began in 1789", True),
        ("The Magna Carta was signed in 1215", True),
        ("Napoleon was born in Spain", False),
        ("The Ottoman Empire ended after WWI", True),
        ("The Cold War followed World War II", True),
        ("Ancient Egypt was in South America", False),
        ("The Renaissance started in Italy", True),
        ("The Titanic sank in 1912", True),
        ("Genghis Khan founded the Roman Empire", False),
        ("The U.S. Civil War ended in 1865", True),
        ("Machu Picchu was built by the Inca", True),
    ],
    "Sports": [
        ("A soccer team fields 11 players", True),
        ("A basketball game has 6 periods in NBA", False),
        ("A marathon is about 42.195 km", True),
        ("Olympic flag has five rings", True),
        ("Tennis uses a shuttlecock", False),
        ("A touchdown is worth 6 points", True),
        ("Golf has 18 holes in a standard round", True),
        ("Cricket over has 6 balls", True),
        ("Baseball has four bases", True),
        ("Judo originated in Brazil", False),
        ("Badminton is played with rackets", True),
        ("An NBA game starts with a jump ball", True),
        ("Volleyball teams may field 20 players at once", False),
        ("The Super Bowl is an NFL event", True),
        ("Rugby and soccer use identical scoring", False),
    ],
    "Geography": [
        ("The Nile flows through Egypt", True),
        ("Canberra is Australia's capital", True),
        ("Mount Everest is in the Himalayas", True),
        ("The Sahara is in South America", False),
        ("Tokyo is in Japan", True),
        ("Greenland is an island", True),
        ("The Pacific is the largest ocean", True),
        ("Paris lies on the Seine", True),
        ("Morocco is in North Africa", True),
        ("Ottawa is the capital of Canada", True),
        ("Italy is in South Asia", False),
        ("The Amazon is in Europe", False),
        ("Hawaii is a U.S. state", True),
        ("Mediterranean touches Europe and Africa", True),
        ("India is in Oceania", False),
    ],
    "Culture": [
        ("Shakespeare wrote Hamlet", True),
        ("The Louvre is in Paris", True),
        ("Beethoven composed symphonies", True),
        ("Manga is a Japanese comic form", True),
        ("Frida Kahlo was a physicist", False),
        ("Tango originated in Argentina", True),
        ("The Odyssey is attributed to Homer", True),
        ("Vincent van Gogh painted Starry Night", True),
        ("Orwell wrote 1984", True),
        ("Piano usually has 88 keys", True),
        ("Surrealism is a coding language", False),
        ("Florence is tied to Renaissance art", True),
        ("Divine Comedy was written by Dante", True),
        ("Picasso painted Guernica", True),
        ("Ballet began as a modern video game", False),
    ],
    "Science": [
        ("Water's formula is H2O", True),
        ("Mars is the Red Planet", True),
        ("The Sun is a planet", False),
        ("Gold's chemical symbol is Au", True),
        ("Photosynthesis uses sunlight", True),
        ("Humans have 206 bones as adults", True),
        ("Nitrogen dominates Earth's atmosphere", True),
        ("Diamond is softer than chalk", False),
        ("Mercury is closest planet to the Sun", True),
        ("Gravity pushes objects away from Earth", False),
        ("Biology studies living organisms", True),
        ("A nucleus is part of an atom", True),
        ("Oxygen is unnecessary for aerobic breathing", False),
        ("The heart pumps blood", True),
        ("DNA stands for deoxyribonucleic acid", True),
    ],
    "Technology": [
        ("CPU stands for Central Processing Unit", True),
        ("HTML is a stylesheet language", False),
        ("CSS is used for web presentation", True),
        ("Git is a version control tool", True),
        ("HTTPS is unsecured HTTP", False),
        ("PostgreSQL is a relational database", True),
        ("Kotlin is used in Android development", True),
        ("npm ships with Node.js", True),
        ("AWS offers cloud compute services", True),
        ("HTTP and HTTPS are identical protocols", False),
        ("API means Application Programming Interface", True),
        ("RAM is persistent disk storage", False),
        ("Microsoft created Windows", True),
        ("Android is a mobile operating system", True),
        ("JavaScript files commonly use .js extension", True),
    ],
}

# NUMBER cards: (question, value)
NUMBER_BANK = {
    "History": [
        ("In which year did WW2 end?", 1945),
        ("In which year did WW1 start?", 1914),
        ("In which year did the Berlin Wall fall?", 1989),
        ("In which year did the U.S. declare independence?", 1776),
        ("In which year did the Titanic sink?", 1912),
        ("In which year did Apollo 11 land on Moon?", 1969),
        ("In which year did French Revolution start?", 1789),
        ("In which year did Soviet Union dissolve?", 1991),
        ("In which year did Magna Carta sign?", 1215),
        ("In which year did U.S. Civil War end?", 1865),
    ],
    "Sports": [
        ("How many players in baseball defense?", 9),
        ("How many holes in golf round?", 18),
        ("How many rings on Olympic flag?", 5),
        ("How many points for NFL touchdown?", 6),
        ("How many balls in cricket over?", 6),
        ("How many players in volleyball team on court?", 6),
        ("How many players in soccer team on field?", 11),
        ("How many minutes in football half (soccer)?", 45),
        ("How many points in basketball free throw?", 1),
        ("How many total minutes in NBA regulation game?", 48),
    ],
    "Geography": [
        ("How many continents are there?", 7),
        ("How many U.S. states are there?", 50),
        ("How many oceans are commonly recognized?", 5),
        ("How many time zones in mainland USA?", 4),
        ("How many letters in word EUROPE?", 6),
        ("How many countries border Germany?", 9),
        ("How many countries in North America (UN style)?", 23),
        ("How many provinces in Canada?", 10),
        ("How many Great Lakes in North America?", 5),
        ("How many equator crossings by prime meridian?", 1),
    ],
    "Culture": [
        ("How many books in Harry Potter main series?", 7),
        ("How many strings on a standard violin?", 4),
        ("How many keys on standard piano?", 88),
        ("How many acts in Hamlet (commonly)?", 5),
        ("How many colors in classic rainbow list?", 7),
        ("How many letters in word OPERA?", 5),
        ("How many members in Beatles core lineup?", 4),
        ("How many films in original Star Wars trilogy?", 3),
        ("How many sides in a haiku syllable pattern lines?", 3),
        ("How many movements in Beethoven's 5th Symphony?", 4),
    ],
    "Science": [
        ("How many planets in Solar System?", 8),
        ("How many elements in periodic table (current)?", 118),
        ("How many bones in adult human body?", 206),
        ("How many chambers in human heart?", 4),
        ("How many states of matter usually taught basic?", 4),
        ("How many DNA bases in canonical set?", 4),
        ("How many electrons in neutral carbon atom?", 6),
        ("How many minutes Earth rotates by 1 degree?", 4),
        ("How many moons does Earth have?", 1),
        ("How many legs does an insect have?", 6),
    ],
    "Technology": [
        ("How many bits in one byte?", 8),
        ("How many layers in OSI model?", 7),
        ("How many binary digits are used?", 2),
        ("How many keys in RSA public/private pair?", 2),
        ("How many primary RGB channels?", 3),
        ("How many ports in a typical USB-A connector?", 1),
        ("How many decimal digits in IPv4 octet max?", 3),
        ("How many minutes in one cron hour step?", 60),
        ("How many letters in acronym HTTP?", 4),
        ("How many slash characters in URL scheme prefix http://?", 2),
    ],
}

CENTURY_DECADE_EVENTS = {
    "History": [("Fall of Berlin Wall", 1989), ("French Revolution begins", 1789), ("WW2 ends", 1945), ("Magna Carta", 1215), ("U.S. independence", 1776), ("Roman Empire in West falls", 476), ("Apollo 11 moon landing", 1969), ("Titanic sinks", 1912), ("Soviet Union dissolves", 1991), ("Printing press by Gutenberg", 1450)],
    "Sports": [("First modern Olympics", 1896), ("First FIFA World Cup", 1930), ("NBA founded", 1946), ("Title IX enacted", 1972), ("Dream Team Olympics", 1992), ("First Wimbledon", 1877), ("First Super Bowl", 1967), ("Women in Olympic marathon", 1984), ("First Paralympics", 1960), ("First Tour de France", 1903)],
    "Geography": [("Suez Canal opens", 1869), ("Panama Canal opens", 1914), ("UN founded", 1945), ("Everest first ascent", 1953), ("Google Maps launched", 2005), ("Antarctica Treaty", 1959), ("Alaska purchased", 1867), ("Berlin Conference", 1884), ("EU Maastricht Treaty", 1992), ("Canal du Midi completed", 1681)],
    "Culture": [("Mona Lisa painted approx", 1503), ("Shakespeare born", 1564), ("Beethoven born", 1770), ("First Oscar awards", 1929), ("The Beatles formed", 1960), ("Star Wars release", 1977), ("Frida Kahlo born", 1907), ("Printing of Don Quixote", 1605), ("Jazz age peak decade", 1920), ("MTV launch", 1981)],
    "Science": [("Newton Principia", 1687), ("Darwin Origin of Species", 1859), ("DNA structure published", 1953), ("Penicillin discovered", 1928), ("Higgs boson announced", 2012), ("First human in space", 1961), ("Periodic table by Mendeleev", 1869), ("CRISPR breakthrough", 2012), ("Einstein relativity paper", 1905), ("James Webb launch", 2021)],
    "Technology": [("First iPhone release", 2007), ("World Wide Web proposed", 1989), ("Linux initial release", 1991), ("IBM PC released", 1981), ("First email sent", 1971), ("Bitcoin whitepaper", 2008), ("Windows 95 release", 1995), ("First transistor", 1947), ("First microprocessor", 1971), ("ChatGPT public release", 2022)],
}

COLOR_QUESTIONS = {
    "History": [("Color of Roman imperial togas in art", "purple"), ("Color tied to surrender flag", "white"), ("Color of many danger signs", "red"), ("Color often linked to monarchy", "purple"), ("Color in many historical peace doves", "white")],
    "Sports": [("Card color for send-off in soccer", "red"), ("Tennis ball official color", "yellow"), ("Color of warning flag in motorsport", "yellow"), ("Olympic flag background color", "white"), ("Common baseball grass color", "green")],
    "Geography": [("Color often used for water on maps", "blue"), ("Color of deserts on many maps", "yellow"), ("Color for forests on maps", "green"), ("Color of Arctic ice in photos", "white"), ("Color often used for volcano danger", "red")],
    "Culture": [("Color linked to blues music name", "blue"), ("Color in phrase black tie event", "black"), ("Color of wedding dress tradition", "white"), ("Color associated with romantic roses", "red"), ("Color of old film slate chalk", "white")],
    "Science": [("Color of chlorophyll-rich leaves", "green"), ("Color of clear daytime sky", "blue"), ("Color of warning lasers in lab signs often", "red"), ("Color of sodium flame test", "yellow"), ("Color for oxidation rust", "brown")],
    "Technology": [("Color of default hyperlink (classic)", "blue"), ("Color of many critical error badges", "red"), ("Color of success status lights", "green"), ("Color used by many warning toasts", "yellow"), ("Color associated with dark mode text", "white")],
}

COLOR_OPTIONS = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white"]

DISTRACTOR_POOL = [
    "London", "Paris", "Tokyo", "Nile", "Mars", "Einstein", "Mercury", "Python", "Java",
    "Git", "Amazon", "Google", "Berlin", "Madrid", "Rio", "Oslo", "Canberra", "Seoul",
    "Super Bowl", "Louvre", "Himalayas", "Atlantic", "Pacific", "Oxygen", "Hydrogen", "Android",
]


def clamp(text: str, limit: int = 42) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def rotate(items, offset, size):
    out = []
    n = len(items)
    for i in range(size):
        out.append(items[(offset + i) % n])
    return out


def synth_false(statement: str) -> str:
    year_match = re.search(r"\b(\d{4})\b", statement)
    if year_match:
        year = int(year_match.group(1))
        return statement.replace(str(year), str(year + 1), 1)
    num_match = re.search(r"\b(\d+)\b", statement)
    if num_match:
        number = int(num_match.group(1))
        return statement.replace(str(number), str(number + 1), 1)
    return f"It is false that {statement}"


def build_true_false(topic: str, idx: int):
    base = TRUE_FALSE_BANK[topic]
    true_pool = [item for item in base if item[1]]
    false_pool = [item for item in base if not item[1]]
    rng = random.Random(9000 + idx + len(topic))
    true_count = 3 + (idx % 4)  # 3..6
    false_count = 10 - true_count

    if len(false_pool) < 10:
        synthetic_false = [(synth_false(text), False) for text, _ in true_pool]
        false_pool = false_pool + synthetic_false

    picked_true = [true_pool[(idx + i) % len(true_pool)] for i in range(true_count)]
    picked_false = [false_pool[(idx * 2 + i) % len(false_pool)] for i in range(false_count)]
    statements = picked_true + picked_false
    # De-duplicate statement texts while preserving target counts.
    dedup = []
    seen = set()
    for text, truth in statements:
        key = norm(text)
        if key in seen:
            continue
        seen.add(key)
        dedup.append((text, truth))
    statements = dedup

    while len(statements) < 10:
        candidate = false_pool[(idx + len(statements)) % len(false_pool)]
        key = norm(candidate[0])
        if key in seen:
            candidate = (f"{candidate[0]} ({len(statements)})", False)
            key = norm(candidate[0])
        seen.add(key)
        statements.append(candidate)

    statements = statements[:10]
    rng.shuffle(statements)

    options = [clamp(text) for text, _ in statements]
    correct_indexes = [i for i, (_, truth) in enumerate(statements) if truth]
    return {
        "question": clamp(f"{topic}: Which statements are true?", 72),
        "options": options,
        "correct": {"correctIndexes": correct_indexes},
        "explanation": "Tap statements you believe are true.",
    }


def build_number(topic: str, idx: int):
    question, value = NUMBER_BANK[topic][idx % len(NUMBER_BANK[topic])]
    deltas = [0, -1, 1, -2, 2, -3, 3, -4, 4, 5]
    options = [str(value + d) for d in deltas]
    return {
        "question": clamp(question, 72),
        "options": [clamp(opt) for opt in options],
        "correct": {"correctIndex": 0, "correctValue": str(value)},
        "explanation": "Choose the exact numeric value.",
    }


def build_order(topic: str, idx: int):
    events = CENTURY_DECADE_EVENTS[topic]
    seq = rotate(events, idx, 10)
    shuffled = seq[:]
    random.Random(4000 + idx + len(topic)).shuffle(shuffled)
    sorted_by_year = sorted(shuffled, key=lambda x: x[1])
    rank_map = {f"{name} ({year})": pos + 1 for pos, (name, year) in enumerate(sorted_by_year)}

    options = [clamp(f"{name} ({year})") for name, year in shuffled]
    correct_order = [rank_map[clamp(f"{name} ({year})")] for name, year in shuffled]
    return {
        "question": clamp(f"{topic}: Order from earliest to latest.", 72),
        "options": options,
        "correct": {"correctOrder": correct_order},
        "explanation": "Pick a position, then reveal matching peg.",
    }


def build_century_decade(topic: str, idx: int):
    event, year = CENTURY_DECADE_EVENTS[topic][idx % len(CENTURY_DECADE_EVENTS[topic])]
    decade = f"{(year // 10) * 10}s"
    distractors = [
        f"{((year // 10) * 10) - 10}s",
        f"{((year // 10) * 10) + 10}s",
        f"{((year // 10) * 10) - 20}s",
        f"{((year // 10) * 10) + 20}s",
        f"{((year // 10) * 10) - 30}s",
        f"{((year // 10) * 10) + 30}s",
        f"{((year // 10) * 10) - 40}s",
        f"{((year // 10) * 10) + 40}s",
        f"{((year // 10) * 10) + 50}s",
    ]
    options = [decade] + distractors[:9]
    return {
        "question": clamp(f"{topic}: In which decade did '{event}' happen?", 72),
        "options": [clamp(opt) for opt in options],
        "correct": {"correctIndex": 0, "correctValue": decade},
        "explanation": "Find the right decade label.",
    }


def build_color(topic: str, idx: int):
    q, answer = COLOR_QUESTIONS[topic][idx % len(COLOR_QUESTIONS[topic])]
    options = [answer] + [c for c in COLOR_OPTIONS if c != answer][:9]
    return {
        "question": clamp(f"{topic}: {q}?", 72),
        "options": [clamp(opt) for opt in options],
        "correct": {"correctIndex": 0, "correctColorName": answer},
        "explanation": "Select the matching color.",
    }


def build_open(topic: str, idx: int):
    q, answer = OPEN_BANK[topic][idx % len(OPEN_BANK[topic])]
    options = [answer]
    for d in DISTRACTOR_POOL:
        if d not in options:
            options.append(d)
        if len(options) == 10:
            break
    return {
        "question": clamp(f"{topic}: {q}", 72),
        "options": [clamp(opt) for opt in options],
        "correct": {"correctIndex": 0, "correctTexts": [answer]},
        "explanation": "Select the best matching answer.",
    }


def build_card(topic: str, category: str, idx: int):
    if category == "TRUE_FALSE":
        payload = build_true_false(topic, idx)
    elif category == "NUMBER":
        payload = build_number(topic, idx)
    elif category == "ORDER":
        payload = build_order(topic, idx)
    elif category == "CENTURY_DECADE":
        payload = build_century_decade(topic, idx)
    elif category == "COLOR":
        payload = build_color(topic, idx)
    else:
        payload = build_open(topic, idx)

    return {
        "id": f"{topic.lower()}-{category.lower()}-{idx + 1:03d}",
        "topic": topic,
        "category": category,
        "language": LANGUAGE,
        "question": payload["question"],
        "options": payload["options"],
        "correct": payload["correct"],
        "explanation": payload["explanation"],
        "difficulty": "2",
        "source": "smart10-generator-v2",
    }


def generate(per_pair: int):
    cards = []
    for category in CATEGORIES:
        for topic in TOPICS:
            for i in range(per_pair):
                cards.append(build_card(topic, category, i))
    return cards


def main():
    parser = argparse.ArgumentParser(description="Generate SmartIQ Smart10 cards")
    parser.add_argument("--per-pair", type=int, default=30, help="Cards per topic/category pair")
    parser.add_argument("--output", type=Path, default=Path("data/smart10/cards.en.json"), help="Output file path")
    args = parser.parse_args()

    cards = generate(args.per_pair)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(cards, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {len(cards)} cards at {args.output}")


if __name__ == "__main__":
    main()

