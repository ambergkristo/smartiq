#!/usr/bin/env python3
import argparse
import json
import random
from pathlib import Path

TOPICS = ["History", "Sports", "Geography", "Culture", "Science", "Varia"]
CATEGORIES = ["TRUE_FALSE", "NUMBER", "ORDER", "CENTURY_DECADE", "COLOR", "OPEN"]

COLOR_PAIRS = [
    ("blue", "yellow", "green"),
    ("red", "blue", "purple"),
    ("red", "yellow", "orange"),
    ("black", "white", "gray"),
    ("red", "white", "pink"),
    ("blue", "red", "purple"),
]

OPEN_QUESTIONS = {
    "History": [
        ("Who led India to independence through nonviolent resistance?", "Mahatma Gandhi"),
        ("Which wall fell in 1989, symbolizing the Cold War's end?", "Berlin Wall"),
        ("Which ship famously sank in 1912 on its maiden voyage?", "Titanic"),
    ],
    "Sports": [
        ("How many players are on the field per soccer team?", "11"),
        ("In tennis, what is a score of zero called?", "Love"),
        ("How many points is a touchdown worth in American football?", "6"),
    ],
    "Geography": [
        ("Which river runs through Egypt into the Mediterranean?", "Nile"),
        ("Which country has the largest population today?", "India"),
        ("What is the capital city of Australia?", "Canberra"),
    ],
    "Culture": [
        ("Who wrote the play Romeo and Juliet?", "William Shakespeare"),
        ("Which instrument has 88 keys on a standard model?", "Piano"),
        ("Which art museum is home to the Mona Lisa?", "Louvre"),
    ],
    "Science": [
        ("What gas do humans need to breathe to survive?", "Oxygen"),
        ("Which planet is known as the Red Planet?", "Mars"),
        ("What is H2O commonly called?", "Water"),
    ],
    "Varia": [
        ("How many days are in a leap year?", "366"),
        ("What device is used to tell time on your wrist?", "Watch"),
        ("Which season comes after spring in the Northern Hemisphere?", "Summer"),
    ],
}

OPEN_DISTRACTORS = [
    "London", "Paris", "Berlin", "Tokyo", "Venus", "Mercury", "Hydrogen", "Nitrogen", "Cello",
    "Violin", "River", "Mountain", "8", "10", "12", "4", "Love", "40", "Ship", "Bridge"
]


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    d = 3
    while d * d <= n:
        if n % d == 0:
            return False
        d += 2
    return True


def build_true_false(topic: str, i: int):
    base = 10 + i
    nums = [base + n for n in range(10)]
    options = []
    correct = []
    for idx, n in enumerate(nums):
        if idx % 2 == 0:
            text = f"{n} is even"
            truth = (n % 2 == 0)
        else:
            text = f"{n} is prime"
            truth = is_prime(n)
        options.append(text)
        if truth:
            correct.append(idx)
    if not correct:
        correct.append(0)
        options[0] = f"{nums[0]} is greater than 0"
    return {
        "question": f"{topic}: Which statements are true?",
        "options": options,
        "correct": {"correctIndexes": correct},
    }


def build_number(topic: str, i: int):
    a = 20 + i
    b = 7 + (i % 9)
    answer = a + b
    options = [str(answer + d) for d in [0, -1, 1, -2, 2, -3, 3, 4, -4, 5]]
    return {
        "question": f"{topic}: What is {a} + {b}?",
        "options": options,
        "correct": {"correctIndex": 0, "numericValue": answer},
    }


def build_order(topic: str, i: int):
    years = [1950 + i + step * 3 for step in range(10)]
    shuffled = years[:]
    random.Random(1000 + i).shuffle(shuffled)
    rank_by_value = {value: rank + 1 for rank, value in enumerate(sorted(shuffled))}
    correct_order = [rank_by_value[value] for value in shuffled]
    return {
        "question": f"{topic}: Order these years from earliest to latest.",
        "options": [str(y) for y in shuffled],
        "correct": {"correctOrder": correct_order},
    }


def build_century_decade(topic: str, i: int):
    year = 1605 + i * 7
    century = (year - 1) // 100 + 1
    options = [
        f"{century}th century",
        f"{max(1, century - 1)}th century",
        f"{century + 1}th century",
        f"{century + 2}th century",
        f"{max(1, century - 2)}th century",
        f"{century + 3}th century",
        f"{max(1, century - 3)}th century",
        f"{century + 4}th century",
        f"{max(1, century - 4)}th century",
        f"{century + 5}th century",
    ]
    return {
        "question": f"{topic}: In which century did the year {year} occur?",
        "options": options,
        "correct": {"correctIndex": 0},
    }


def build_color(topic: str, i: int):
    left, right, answer = COLOR_PAIRS[i % len(COLOR_PAIRS)]
    options = [answer, "red", "blue", "yellow", "green", "orange", "purple", "brown", "black", "white"]
    seen = set()
    deduped = []
    for item in options:
        if item not in seen:
            deduped.append(item)
            seen.add(item)
    while len(deduped) < 10:
        deduped.append(f"shade{len(deduped)}")
    return {
        "question": f"{topic}: Which color comes from mixing {left} and {right}?",
        "options": deduped[:10],
        "correct": {"correctIndex": 0},
    }


def build_open(topic: str, i: int):
    pool = OPEN_QUESTIONS[topic]
    q, answer = pool[i % len(pool)]
    options = [answer]
    for distractor in OPEN_DISTRACTORS:
        if distractor != answer and distractor not in options:
            options.append(distractor)
        if len(options) == 10:
            break
    return {
        "question": f"{topic}: {q}",
        "options": options,
        "correct": {"correctIndex": 0},
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
        "language": "en",
        "question": payload["question"],
        "options": payload["options"],
        "correct": payload["correct"],
        "difficulty": "2",
        "source": "smart10-generator-v1",
    }


def generate(per_pair: int):
    cards = []
    for category in CATEGORIES:
        for topic in TOPICS:
            for i in range(per_pair):
                cards.append(build_card(topic, category, i))
    return cards


def main():
    parser = argparse.ArgumentParser(description="Generate SmartIQ Smart10-style cards")
    parser.add_argument("--per-pair", type=int, default=9, help="Cards per topic/category pair")
    parser.add_argument("--output", type=Path, default=Path("data/smart10/cards.en.json"), help="Output json path")
    args = parser.parse_args()

    cards = generate(args.per_pair)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(cards, indent=2), encoding="utf-8")
    print(f"Generated {len(cards)} cards at {args.output}")


if __name__ == "__main__":
    main()
