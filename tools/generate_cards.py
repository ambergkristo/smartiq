#!/usr/bin/env python3
import argparse
import json
import random
from pathlib import Path

TOPICS = ["History", "Sports", "Geography", "Culture", "Science", "Varia"]
CATEGORIES = ["TRUE_FALSE", "NUMBER", "ORDER", "CENTURY_DECADE", "COLOR", "OPEN"]

TOPIC_TERMS = {
    "History": [
        "Ancient Rome", "Viking Age", "Renaissance", "Industrial Revolution", "French Revolution",
        "Silk Road", "Magna Carta", "Ottoman Empire", "Ming Dynasty", "Norman Conquest",
        "Napoleon", "Julius Caesar", "Alexander the Great", "Gutenberg Press", "Roman Republic",
        "Cold War", "Berlin Wall", "Apollo 11", "Treaty of Versailles", "Byzantine Empire",
        "Meiji Restoration", "Age of Exploration", "Bronze Age", "Iron Age", "Harlem Renaissance",
        "Printing Press", "Han Dynasty", "Pax Romana", "Persian Empire", "Maya Civilization",
        "Inca Empire", "Aztec Empire", "Hundred Years War", "Thirty Years War", "Romanov Dynasty",
        "Black Death", "Great Fire of London", "Bastille", "Waterloo", "Normandy Landings",
        "UN Charter", "Marshall Plan", "Sputnik", "Cuban Missile Crisis", "Fall of USSR"
    ],
    "Sports": [
        "Football", "Basketball", "Tennis", "Cricket", "Rugby", "Volleyball", "Handball", "Baseball",
        "Hockey", "Badminton", "Table Tennis", "Athletics", "Swimming", "Cycling", "Boxing",
        "Fencing", "Judo", "Karate", "Golf", "Snooker", "Formula One", "MotoGP", "Marathon",
        "Triathlon", "Decathlon", "Wimbledon", "Olympics", "World Cup", "UEFA Champions League",
        "NBA Finals", "Super Bowl", "Tour de France", "Davis Cup", "Stanley Cup", "Copa America",
        "Slam Dunk", "Penalty Kick", "Hat Trick", "Offside", "Free Throw", "Golden Goal",
        "Pole Vault", "Long Jump", "Relay Race", "Sprint Finish"
    ],
    "Geography": [
        "Tallinn", "Riga", "Vilnius", "Helsinki", "Stockholm", "Oslo", "Copenhagen", "Reykjavik",
        "London", "Paris", "Berlin", "Rome", "Madrid", "Lisbon", "Vienna", "Prague", "Warsaw",
        "Budapest", "Athens", "Dublin", "Canberra", "Ottawa", "Tokyo", "Seoul", "Beijing",
        "New Delhi", "Nile", "Amazon", "Danube", "Rhine", "Sahara", "Gobi", "Himalayas",
        "Alps", "Andes", "Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean",
        "Antarctica", "Greenland", "Madagascar", "Iceland", "Borneo"
    ],
    "Culture": [
        "Mona Lisa", "Starry Night", "Hamlet", "Macbeth", "The Odyssey", "The Iliad", "Don Quixote",
        "The Great Gatsby", "Pride and Prejudice", "War and Peace", "The Godfather", "Casablanca",
        "Citizen Kane", "The Beatles", "Mozart", "Beethoven", "Bach", "Chopin", "Picasso", "Van Gogh",
        "Michelangelo", "Da Vinci", "Shakespeare", "Jane Austen", "Tolstoy", "Dostoevsky", "Homer",
        "Sculpture", "Opera", "Ballet", "Jazz", "Blues", "Rock", "Hip Hop", "Cinema", "Theater",
        "Poetry", "Novel", "Fresco", "Symphony", "Concerto", "Sonata", "Renaissance Art", "Impressionism",
        "Surrealism"
    ],
    "Science": [
        "Atom", "Molecule", "Electron", "Proton", "Neutron", "Photon", "Gravity", "Velocity",
        "Acceleration", "Momentum", "Energy", "Entropy", "Oxygen", "Hydrogen", "Nitrogen",
        "Carbon", "Helium", "Neon", "Sodium", "Potassium", "Calcium", "Iron", "Copper", "Silver",
        "Gold", "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune",
        "DNA", "RNA", "Cell", "Neuron", "Enzyme", "Photosynthesis", "Evolution", "Telescope",
        "Microscope", "Quantum", "Relativity", "Ecosystem", "Biodiversity"
    ],
    "Varia": [
        "Calendar", "Compass", "Keyboard", "Notebook", "Backpack", "Umbrella", "Clock", "Watch",
        "Bicycle", "Scooter", "Elevator", "Subway", "Airport", "Library", "Museum", "Restaurant",
        "Recipe", "Sandwich", "Pasta", "Chocolate", "Coffee", "Tea", "Orange", "Banana", "Apple",
        "Laptop", "Smartphone", "Headphones", "Camera", "Printer", "Puzzle", "Chess", "Checkers",
        "Sudoku", "Map", "Ticket", "Passport", "Invoice", "Wallet", "Backyard", "Garden", "Window",
        "Doorbell", "Lantern", "Fireplace"
    ]
}

COLOR_CLUES = [
    ("clear daytime sky", "Blue"),
    ("fresh grass", "Green"),
    ("ripe banana peel", "Yellow"),
    ("ripe tomato", "Red"),
    ("new snow", "White"),
    ("charcoal", "Black"),
    ("pumpkin skin", "Orange"),
    ("lavender flower", "Purple"),
    ("strawberry ice cream", "Pink"),
    ("cocoa powder", "Brown"),
    ("storm cloud", "Gray"),
    ("deep ocean at night", "Navy"),
    ("mint leaf", "Mint"),
    ("gold medal", "Gold"),
    ("silver coin", "Silver")
]

QUESTION_TEMPLATES = {
    "TRUE_FALSE": [
        "{topic}: Mark statements that are true for this topic.",
        "{topic}: Which claims are accurate?",
        "{topic}: Find the statements that fit.",
        "{topic}: Select all true statements.",
        "{topic}: Which lines are correct?",
        "{topic}: Identify valid statements."
    ],
    "NUMBER": [
        "{topic}: How many letters are in '{term}'?",
        "{topic}: Count the letters in '{term}'.",
        "{topic}: Letter count for '{term}'?",
        "{topic}: How many characters (letters only) in '{term}'?",
        "{topic}: What's the letter total in '{term}'?",
        "{topic}: Choose the letter count of '{term}'."
    ],
    "ORDER": [
        "{topic}: Sort these from A to Z.",
        "{topic}: Put these entries in alphabetical order.",
        "{topic}: Rank items alphabetically (A to Z).",
        "{topic}: Arrange all options by alphabet.",
        "{topic}: Order the list lexicographically.",
        "{topic}: Build an A-Z order for these options."
    ],
    "CENTURY_DECADE": [
        "{topic}: Which decade includes {year}?",
        "{topic}: Pick the decade for {year}.",
        "{topic}: {year} falls in which decade?",
        "{topic}: In which century is {year}?",
        "{topic}: Choose the century that contains {year}.",
        "{topic}: {year} falls in which century?"
    ],
    "COLOR": [
        "{topic}: Which color matches '{clue}'?",
        "{topic}: Pick the color best matching '{clue}'.",
        "{topic}: Select the color for '{clue}'.",
        "{topic}: '{clue}' is closest to which color?",
        "{topic}: Which option names the right color for '{clue}'?",
        "{topic}: Choose the color cue: '{clue}'."
    ],
    "OPEN": [
        "{topic}: Select statements that are true.",
        "{topic}: Which statements are correct?",
        "{topic}: Pick all true statements.",
        "{topic}: Identify factual statements.",
        "{topic}: Which options are accurate?",
        "{topic}: Select all valid statements."
    ]
}

TRUE_FALSE_FACTS = {
    "History": {
        "true": [
            "Magna Carta was signed in 1215.",
            "WWII ended in 1945.",
            "Apollo 11 landed in 1969.",
            "Berlin Wall fell in 1989.",
            "Napoleon lost at Waterloo.",
            "Renaissance began in Italy.",
            "USSR dissolved in 1991.",
            "Printing press spread in 1400s.",
            "Roman Republic came before Empire.",
            "Byzantium centered in Constantinople.",
            "Cold War followed World War II.",
            "Caesar was killed in 44 BC."
        ],
        "false": [
            "Magna Carta was signed in 1512.",
            "WWII ended in 1939.",
            "Apollo 11 landed in 1959.",
            "Berlin Wall fell in 1973.",
            "Napoleon won at Waterloo.",
            "Renaissance began in Australia.",
            "USSR dissolved in 1961.",
            "Printing press spread in 1700s.",
            "Roman Empire came before Republic.",
            "Byzantium was centered in Madrid.",
            "Cold War started before WWI.",
            "Caesar was killed in 144 BC."
        ]
    },
    "Sports": {
        "true": [
            "A hat trick means three goals.",
            "Wimbledon is a tennis tournament.",
            "Marathon length is 42.195 km.",
            "Basketball uses a hoop.",
            "Offside is a football rule.",
            "Olympics are held every four years.",
            "Tour de France is a cycling race.",
            "Free throw is from basketball.",
            "Stanley Cup is for ice hockey.",
            "Rugby uses an oval ball.",
            "Tennis can be played on clay.",
            "Cricket uses wickets."
        ],
        "false": [
            "Hat trick means five goals.",
            "Wimbledon is a golf major.",
            "Marathon length is 12 km.",
            "Basketball has no hoops.",
            "Offside is a tennis rule.",
            "Olympics happen every year.",
            "Tour de France is a swim race.",
            "Free throw is from baseball.",
            "Stanley Cup is for basketball.",
            "Rugby uses a ping-pong ball.",
            "Tennis is only indoor sport.",
            "Cricket has no bat."
        ]
    },
    "Geography": {
        "true": [
            "Canberra is Australia's capital.",
            "Nile flows through Egypt.",
            "Sahara is a desert.",
            "Pacific is the largest ocean.",
            "Tokyo is in Japan.",
            "Danube flows through Europe.",
            "Iceland is an island nation.",
            "Andes are in South America.",
            "Lisbon is in Portugal.",
            "Greenland is mostly ice-covered.",
            "Himalayas include Mount Everest.",
            "Ottawa is Canada's capital."
        ],
        "false": [
            "Canberra is in New Zealand.",
            "Nile flows through Brazil.",
            "Sahara is a rainforest.",
            "Atlantic is the largest ocean.",
            "Tokyo is in South Korea.",
            "Danube flows through Australia.",
            "Iceland is in the tropics.",
            "Andes are in Africa.",
            "Lisbon is in Spain.",
            "Greenland is near equator.",
            "Everest is in the Alps.",
            "Ottawa is US capital."
        ]
    },
    "Culture": {
        "true": [
            "Shakespeare wrote Hamlet.",
            "Mona Lisa is a painting.",
            "Mozart was a composer.",
            "Beatles formed in Liverpool.",
            "Picasso painted Guernica.",
            "Ballet is a dance form.",
            "Opera combines music and drama.",
            "Jazz began in the United States.",
            "Van Gogh painted Starry Night.",
            "The Odyssey is an epic poem.",
            "Cinema uses moving images.",
            "Beethoven wrote symphonies."
        ],
        "false": [
            "Shakespeare wrote Don Quixote.",
            "Mona Lisa is a sculpture.",
            "Mozart was a film director.",
            "Beatles formed in Tokyo.",
            "Picasso painted The Scream.",
            "Ballet is a martial art.",
            "Opera has no singing.",
            "Jazz began in medieval France.",
            "Van Gogh painted The Last Supper.",
            "The Odyssey is a modern novel.",
            "Cinema predates photography.",
            "Beethoven wrote no music."
        ]
    },
    "Science": {
        "true": [
            "Water is H2O.",
            "Earth orbits the Sun.",
            "DNA carries genetic information.",
            "Electrons have negative charge.",
            "Mars is called the Red Planet.",
            "Plants use photosynthesis.",
            "Atoms have a nucleus.",
            "Sound travels slower than light.",
            "Gravity attracts mass.",
            "Neurons transmit signals.",
            "Oxygen supports combustion.",
            "Water boils at 100C."
        ],
        "false": [
            "Water is CO2.",
            "Sun orbits the Earth.",
            "DNA stores photos.",
            "Electrons are positively charged.",
            "Mars is the hottest planet.",
            "Plants grow without sunlight.",
            "Atoms have no protons.",
            "Sound travels faster than light.",
            "Gravity repels all mass.",
            "Neurons are only in plants.",
            "Oxygen cannot support fire.",
            "Water boils at 10C."
        ]
    },
    "Varia": {
        "true": [
            "A week has seven days.",
            "Passport is travel ID.",
            "Keyboard is an input device.",
            "Library lends books.",
            "Coffee contains caffeine.",
            "Wallet holds cash or cards.",
            "Compass points north.",
            "Ticket can grant entry.",
            "Recipe lists ingredients.",
            "Umbrella helps in rain.",
            "Clock shows time.",
            "Airport serves air travel."
        ],
        "false": [
            "A week has nine days.",
            "Passport is a house key.",
            "Keyboard is a cooking tool.",
            "Libraries sell cars.",
            "Coffee is made from plastic.",
            "Wallet is footwear.",
            "Compass measures temperature.",
            "Ticket is always free money.",
            "Recipe is a tax document.",
            "Umbrella is for underwater use.",
            "Clock writes emails.",
            "Airport is only for trains."
        ]
    }
}

NUMBER_FACTS = {
    "History": [
        {"question": "In which year did WWII end?", "answer": 1945},
        {"question": "In which year did Berlin Wall fall?", "answer": 1989},
        {"question": "In which year did Apollo 11 land?", "answer": 1969},
        {"question": "In which year was Magna Carta signed?", "answer": 1215},
        {"question": "In which year did USSR dissolve?", "answer": 1991},
        {"question": "In which year did WWI start?", "answer": 1914},
    ],
    "Sports": [
        {"question": "Players on football team on field?", "answer": 11},
        {"question": "Points for a basketball free throw?", "answer": 1},
        {"question": "Holes in a standard golf round?", "answer": 18},
        {"question": "Sets to win men's Grand Slam match?", "answer": 3},
        {"question": "Distance of marathon in kilometers?", "answer": 42},
        {"question": "Minutes in one football half?", "answer": 45},
    ],
    "Geography": [
        {"question": "How many continents are commonly listed?", "answer": 7},
        {"question": "How many oceans are commonly named?", "answer": 5},
        {"question": "How many countries are in the EU (2026)?", "answer": 27},
        {"question": "How many US states are there?", "answer": 50},
        {"question": "How many time zones does China use?", "answer": 1},
        {"question": "How many degrees in a full circle?", "answer": 360},
    ],
    "Culture": [
        {"question": "How many strings on a violin?", "answer": 4},
        {"question": "How many books in LOTR trilogy?", "answer": 3},
        {"question": "How many Oscars in EGOT acronym?", "answer": 4},
        {"question": "How many Harry Potter books exist?", "answer": 7},
        {"question": "How many acts in a classical drama?", "answer": 5},
        {"question": "How many lines in a Shakespeare sonnet?", "answer": 14},
    ],
    "Science": [
        {"question": "How many planets in Solar System?", "answer": 8},
        {"question": "How many bones in adult human body?", "answer": 206},
        {"question": "How many elements in periodic table?", "answer": 118},
        {"question": "How many DNA bases are canonical?", "answer": 4},
        {"question": "How many minutes in one day?", "answer": 1440},
        {"question": "How many protons does carbon have?", "answer": 6},
    ],
    "Varia": [
        {"question": "How many days in leap year?", "answer": 366},
        {"question": "How many months in one year?", "answer": 12},
        {"question": "How many hours in one day?", "answer": 24},
        {"question": "How many minutes in one hour?", "answer": 60},
        {"question": "How many letters in English alphabet?", "answer": 26},
        {"question": "How many days in one week?", "answer": 7},
    ],
}

ORDER_SEQUENCES = {
    "History": [
        {
            "question": "History: Order earliest to latest.",
            "ordered": [
                "Magna Carta signed",
                "Columbus reaches Americas",
                "French Revolution starts",
                "Battle of Waterloo",
                "WWI begins",
                "WWII begins",
                "WWII ends",
                "Apollo 11 landing",
                "Berlin Wall falls",
                "USSR dissolves",
            ],
        },
        {
            "question": "History: Order oldest era to newest.",
            "ordered": [
                "Bronze Age",
                "Iron Age",
                "Classical Antiquity",
                "Middle Ages",
                "Renaissance",
                "Enlightenment",
                "Industrial Revolution",
                "World War I",
                "World War II",
                "Cold War",
            ],
        },
        {
            "question": "History: Order dates from past to recent.",
            "ordered": ["1066", "1215", "1492", "1776", "1789", "1815", "1914", "1939", "1969", "1989"],
        },
    ],
    "Sports": [
        {
            "question": "Sports: Order by distance, shortest first.",
            "ordered": [
                "100m sprint",
                "200m sprint",
                "400m sprint",
                "800m run",
                "1500m run",
                "5000m run",
                "10000m run",
                "Half marathon",
                "Marathon",
                "50km race walk",
            ],
        },
        {
            "question": "Sports: Order by event duration, shortest first.",
            "ordered": [
                "Table tennis rally",
                "100m sprint race",
                "Boxing round",
                "Basketball quarter",
                "Football half",
                "Rugby half",
                "Tennis set",
                "Baseball game",
                "Cricket T20 match",
                "Test cricket day",
            ],
        },
        {
            "question": "Sports: Order by players per side, low to high.",
            "ordered": [
                "Tennis singles",
                "Beach volleyball",
                "Basketball",
                "Volleyball",
                "Water polo",
                "Rugby union",
                "Baseball",
                "Cricket",
                "Football",
                "Aussie rules football",
            ],
        },
    ],
    "Geography": [
        {
            "question": "Geography: Order countries by area, small to large.",
            "ordered": [
                "Iceland",
                "United Kingdom",
                "France",
                "Ukraine",
                "India",
                "Argentina",
                "Kazakhstan",
                "China",
                "Canada",
                "Russia",
            ],
        },
        {
            "question": "Geography: Order city latitude south to north.",
            "ordered": [
                "Canberra",
                "Cape Town",
                "Buenos Aires",
                "Nairobi",
                "Singapore",
                "Cairo",
                "Athens",
                "Paris",
                "Stockholm",
                "Reykjavik",
            ],
        },
        {
            "question": "Geography: Order mountain heights, low to high.",
            "ordered": [
                "Mont Blanc",
                "Denali",
                "Kilimanjaro",
                "Aconcagua",
                "Elbrus",
                "Vinson Massif",
                "K2",
                "Kangchenjunga",
                "Lhotse",
                "Everest",
            ],
        },
    ],
    "Culture": [
        {
            "question": "Culture: Order art periods earliest to latest.",
            "ordered": [
                "Classical art",
                "Medieval art",
                "Renaissance",
                "Baroque",
                "Neoclassicism",
                "Romanticism",
                "Impressionism",
                "Cubism",
                "Surrealism",
                "Pop art",
            ],
        },
        {
            "question": "Culture: Order release year, oldest first.",
            "ordered": [
                "Citizen Kane",
                "Casablanca",
                "Psycho",
                "The Godfather",
                "Jaws",
                "Star Wars",
                "Blade Runner",
                "Pulp Fiction",
                "The Matrix",
                "Inception",
            ],
        },
        {
            "question": "Culture: Order literary periods by start.",
            "ordered": [
                "Epic poetry age",
                "Classical drama",
                "Medieval literature",
                "Renaissance literature",
                "Enlightenment writing",
                "Romanticism",
                "Realism",
                "Modernism",
                "Postmodernism",
                "Contemporary fiction",
            ],
        },
    ],
    "Science": [
        {
            "question": "Science: Order planets from Sun outward.",
            "ordered": [
                "Mercury",
                "Venus",
                "Earth",
                "Mars",
                "Jupiter",
                "Saturn",
                "Uranus",
                "Neptune",
                "Pluto",
                "Eris",
            ],
        },
        {
            "question": "Science: Order SI prefixes small to large.",
            "ordered": [
                "nano",
                "micro",
                "milli",
                "centi",
                "deci",
                "base unit",
                "deca",
                "hecto",
                "kilo",
                "mega",
            ],
        },
        {
            "question": "Science: Order scale from smallest upward.",
            "ordered": [
                "atom",
                "molecule",
                "virus",
                "bacterium",
                "cell",
                "tissue",
                "organ",
                "organism",
                "population",
                "ecosystem",
            ],
        },
    ],
    "Varia": [
        {
            "question": "Varia: Order time units shortest to longest.",
            "ordered": [
                "second",
                "minute",
                "hour",
                "day",
                "week",
                "month",
                "year",
                "decade",
                "century",
                "millennium",
            ],
        },
        {
            "question": "Varia: Order file sizes smallest to largest.",
            "ordered": [
                "bit",
                "byte",
                "kilobyte",
                "megabyte",
                "gigabyte",
                "terabyte",
                "petabyte",
                "exabyte",
                "zettabyte",
                "yottabyte",
            ],
        },
        {
            "question": "Varia: Order currency values low to high.",
            "ordered": [
                "1 cent",
                "5 cents",
                "10 cents",
                "25 cents",
                "50 cents",
                "1 dollar",
                "2 dollars",
                "5 dollars",
                "10 dollars",
                "20 dollars",
            ],
        },
    ],
}

ORDER_PROMPTS = [
    "Use strict ascending order.",
    "Place earliest/lowest at rank 1.",
    "Build one correct sequence.",
    "Rank all options from first to last.",
    "Do not skip any rank.",
    "Each rank is used exactly once.",
]

YEAR_BASE = {
    "History": 1066,
    "Sports": 1896,
    "Geography": 1521,
    "Culture": 1605,
    "Science": 1543,
    "Varia": 1700,
}


def norm(text: str) -> str:
    return " ".join(str(text).strip().split())


def clamp_option(text: str, limit: int = 42) -> str:
    value = norm(text)
    return value if len(value) <= limit else value[: limit - 3].rstrip() + "..."


def topic_anchor(topic: str, card_idx: int) -> str:
    terms = TOPIC_TERMS[topic]
    return terms[card_idx % len(terms)]


def topic_distractors(topic: str, rnd: random.Random, count: int) -> list[str]:
    pool = []
    for other_topic, terms in TOPIC_TERMS.items():
        if other_topic == topic:
            continue
        pool.extend(terms)
    rnd.shuffle(pool)
    return [clamp_option(x) for x in pool[:count]]


def pick_unique(pool: list[str], count: int, rnd: random.Random) -> list[str]:
    values = pool[:]
    rnd.shuffle(values)
    return values[:count]


def build_true_false(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"tf-{topic}-{card_idx}")
    fact_pool = TRUE_FALSE_FACTS[topic]
    true_count = [2, 3, 4, 5, 6, 7][card_idx % 6]
    true_terms = pick_unique(fact_pool["true"], true_count, rnd)
    false_terms = pick_unique(fact_pool["false"], 10 - true_count, rnd)

    options = true_terms + false_terms
    rnd.shuffle(options)
    true_set = set(true_terms)
    correct_indexes = [index for index, statement in enumerate(options) if statement in true_set]
    anchor = topic_anchor(topic, card_idx)
    return {
        "question": (
            f"{QUESTION_TEMPLATES['TRUE_FALSE'][card_idx % len(QUESTION_TEMPLATES['TRUE_FALSE'])].format(topic=topic)} "
            f"Focus area: {anchor}."
        ),
        "options": options,
        "correct": {"correctIndexes": sorted(correct_indexes)},
    }


def build_number(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"num-{topic}-{card_idx}")
    fact = NUMBER_FACTS[topic][card_idx % len(NUMBER_FACTS[topic])]
    answer = int(fact["answer"])
    if answer <= 20:
        offsets = [0, -1, 1, -2, 2, -3, 3, -4, 4, 5]
    elif answer <= 200:
        offsets = [0, -2, 2, -5, 5, -8, 8, -10, 10, 12]
    else:
        offsets = [0, -5, 5, -10, 10, -20, 20, -30, 30, 40]
    options = []
    for off in offsets:
        value = max(1, answer + off)
        if value not in options:
            options.append(value)
    spread = max(6, answer // 10)
    while len(options) < 10:
        candidate = answer + rnd.randint(-spread, spread)
        spread += max(1, spread // 5)
        if candidate < 1:
            continue
        if candidate not in options:
            options.append(candidate)
    options = options[:10]
    rnd.shuffle(options)
    correct_index = options.index(answer)
    anchor = topic_anchor(topic, card_idx)
    return {
        "question": f"{topic}: {fact['question']} Context tag: {anchor}.",
        "options": [str(value) for value in options],
        "correct": {"correctIndex": correct_index, "answerType": "number"},
    }


def build_order(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"order-{topic}-{card_idx}")
    sequence = ORDER_SEQUENCES[topic][card_idx % len(ORDER_SEQUENCES[topic])]
    ordered_values = [clamp_option(item) for item in sequence["ordered"]]
    options = ordered_values[:]
    rnd.shuffle(options)

    rank_lookup = {value: rank for rank, value in enumerate(ordered_values, start=1)}
    rank_by_index = [0] * 10
    for idx, value in enumerate(options):
        rank_by_index[idx] = rank_lookup[value]

    anchor = topic_anchor(topic, card_idx)
    return {
        "question": f"{sequence['question']} {ORDER_PROMPTS[card_idx % len(ORDER_PROMPTS)]} Theme: {anchor}.",
        "options": options,
        "correct": {"rankByIndex": rank_by_index},
    }


def build_century_decade(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"cd-{topic}-{card_idx}")
    year = YEAR_BASE[topic] + card_idx * 7
    if card_idx % 2 == 0:
        decade = (year // 10) * 10
        correct_label = f"{decade}s"
        option_pool = [f"{decade + delta}s" for delta in (-40, -30, -20, -10, 0, 10, 20, 30, 40, 50)]
        question = QUESTION_TEMPLATES["CENTURY_DECADE"][card_idx % 3].format(topic=topic, year=year)
    else:
        century = ((year - 1) // 100) + 1
        suffix = "th"
        if century % 10 == 1 and century % 100 != 11:
            suffix = "st"
        elif century % 10 == 2 and century % 100 != 12:
            suffix = "nd"
        elif century % 10 == 3 and century % 100 != 13:
            suffix = "rd"
        correct_label = f"{century}{suffix} century"
        option_pool = []
        for delta in (-4, -3, -2, -1, 0, 1, 2, 3, 4, 5):
            c = max(1, century + delta)
            s = "th"
            if c % 10 == 1 and c % 100 != 11:
                s = "st"
            elif c % 10 == 2 and c % 100 != 12:
                s = "nd"
            elif c % 10 == 3 and c % 100 != 13:
                s = "rd"
            option_pool.append(f"{c}{s} century")
        question = QUESTION_TEMPLATES["CENTURY_DECADE"][3 + (card_idx % 3)].format(topic=topic, year=year)

    options = list(dict.fromkeys(option_pool))
    if correct_label not in options:
        options[0] = correct_label
    while len(options) < 10:
        options.append(f"{year + rnd.randint(60, 400)}s")
    options = options[:10]
    rnd.shuffle(options)

    return {
        "question": question,
        "options": [clamp_option(x) for x in options],
        "correct": {"correctIndex": options.index(correct_label)},
    }


def build_color(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"color-{topic}-{card_idx}")
    clue, answer = COLOR_CLUES[card_idx % len(COLOR_CLUES)]
    palette = [
        "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Pink", "Black", "White", "Brown",
        "Gray", "Navy", "Mint", "Gold", "Silver"
    ]
    rnd.shuffle(palette)
    options = [answer]
    for color in palette:
        if color != answer:
            options.append(color)
        if len(options) == 10:
            break
    rnd.shuffle(options)

    return {
        "question": QUESTION_TEMPLATES["COLOR"][card_idx % len(QUESTION_TEMPLATES["COLOR"])].format(topic=topic, clue=clue),
        "options": options,
        "correct": {"correctIndex": options.index(answer)},
    }


def build_open(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"open-{topic}-{card_idx}")
    fact_pool = TRUE_FALSE_FACTS[topic]
    correct_size = [2, 3, 4, 5][card_idx % 4]
    correct_items = pick_unique(fact_pool["true"], correct_size, rnd)
    distractors = pick_unique(fact_pool["false"], 10 - correct_size, rnd)
    options = correct_items + distractors
    rnd.shuffle(options)
    correct_set = set(correct_items)
    correct_indexes = [idx for idx, item in enumerate(options) if item in correct_set]

    anchor = topic_anchor(topic, card_idx)
    return {
        "question": (
            f"{QUESTION_TEMPLATES['OPEN'][card_idx % len(QUESTION_TEMPLATES['OPEN'])].format(topic=topic)} "
            f"Topic clue: {anchor}."
        ),
        "options": options,
        "correct": {"correctIndexes": sorted(correct_indexes)},
    }


def build_card(topic: str, category: str, idx: int) -> dict:
    builders = {
        "TRUE_FALSE": build_true_false,
        "NUMBER": build_number,
        "ORDER": build_order,
        "CENTURY_DECADE": build_century_decade,
        "COLOR": build_color,
        "OPEN": build_open,
    }
    payload = builders[category](topic, idx)
    return {
        "id": f"{topic.lower()}-{category.lower()}-{idx + 1:03d}",
        "cardId": f"{topic.lower()}-{category.lower()}-{idx + 1:03d}",
        "topic": topic,
        "category": category,
        "language": "en",
        "question": payload["question"],
        "options": payload["options"],
        "correct": payload["correct"],
        "difficulty": "2",
        "source": "smartiq-v2",
    }


def generate(per_pair: int) -> list[dict]:
    cards = []
    for category in CATEGORIES:
        for topic in TOPICS:
            for i in range(per_pair):
                cards.append(build_card(topic, category, i))
    return cards


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate SmartIQ Smart10-like cards")
    parser.add_argument("--per-pair", type=int, default=30, help="Cards per topic/category pair")
    parser.add_argument("--output", type=Path, default=Path("data/smart10/cards.en.json"), help="Output JSON path")
    args = parser.parse_args()

    cards = generate(args.per_pair)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(cards, indent=2), encoding="utf-8")
    print(f"Generated {len(cards)} cards at {args.output}")


if __name__ == "__main__":
    main()
