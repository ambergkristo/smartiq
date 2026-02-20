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


def topic_distractors(topic: str, rnd: random.Random, count: int) -> list[str]:
    pool = []
    for other_topic, terms in TOPIC_TERMS.items():
        if other_topic == topic:
            continue
        pool.extend(terms)
    rnd.shuffle(pool)
    return [clamp_option(x) for x in pool[:count]]


def build_true_false(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"tf-{topic}-{card_idx}")
    local_terms = TOPIC_TERMS[topic][:]
    rnd.shuffle(local_terms)
    true_count = [2, 3, 4, 5, 6, 7][card_idx % 6]

    true_terms = local_terms[:true_count]
    false_terms = topic_distractors(topic, rnd, 10 - true_count)

    options = [f"{term} belongs to {topic}." for term in true_terms]
    options.extend(f"{term} belongs to {topic}." for term in false_terms)
    rnd.shuffle(options)

    correct_indexes = [index for index, statement in enumerate(options) if statement.split(" belongs to ")[0] in true_terms]
    return {
        "question": f"{topic}: Which statements are true?",
        "options": [clamp_option(x) for x in options],
        "correct": {"correctIndexes": sorted(correct_indexes)},
    }


def build_number(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"num-{topic}-{card_idx}")
    term = TOPIC_TERMS[topic][card_idx % len(TOPIC_TERMS[topic])]
    answer = len(term.replace(" ", "").replace("-", ""))
    offsets = [0, -1, 1, -2, 2, -3, 3, -4, 4, 5]
    options = []
    for off in offsets:
        value = max(2, answer + off)
        if value not in options:
            options.append(value)
    spread = 6
    while len(options) < 10:
        candidate = answer + rnd.randint(-spread, spread)
        spread += 1
        if candidate < 1:
            continue
        if candidate not in options:
            options.append(candidate)
    options = options[:10]
    rnd.shuffle(options)
    correct_index = options.index(answer)
    return {
        "question": f"{topic}: How many letters are in '{term}'?",
        "options": [str(value) for value in options],
        "correct": {"correctIndex": correct_index, "answerType": "number"},
    }


def build_order(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"order-{topic}-{card_idx}")
    candidates = TOPIC_TERMS[topic][:]
    rnd.shuffle(candidates)
    picked = candidates[:10]
    options = [clamp_option(item) for item in picked]

    ranked = sorted((value.lower(), idx) for idx, value in enumerate(options))
    rank_by_index = [0] * 10
    for rank, (_, idx) in enumerate(ranked, start=1):
        rank_by_index[idx] = rank

    return {
        "question": f"{topic}: Rank these A-Z.",
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
        question = f"{topic}: Which decade includes {year}?"
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
        question = f"{topic}: In which century is {year}?"

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
        "question": f"{topic}: Which color matches '{clue}'?",
        "options": options,
        "correct": {"correctIndex": options.index(answer)},
    }


def build_open(topic: str, card_idx: int) -> dict:
    rnd = random.Random(f"open-{topic}-{card_idx}")
    local_terms = TOPIC_TERMS[topic][:]
    rnd.shuffle(local_terms)
    correct_size = [2, 3, 4, 5][card_idx % 4]
    correct_items = [clamp_option(x) for x in local_terms[:correct_size]]

    distractors = topic_distractors(topic, rnd, 10 - correct_size)
    options = correct_items + distractors
    rnd.shuffle(options)
    correct_indexes = [idx for idx, item in enumerate(options) if item in correct_items]

    return {
        "question": f"{topic}: Which options belong to this topic?",
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
        "source": "smart10-v2-curated",
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
