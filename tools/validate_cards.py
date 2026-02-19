#!/usr/bin/env python3
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

TOPICS = {"History", "Sports", "Geography", "Culture", "Science", "Technology"}
CATEGORIES = {"TRUE_FALSE", "NUMBER", "ORDER", "CENTURY_DECADE", "COLOR", "OPEN"}
MAX_OPTION_HARD = 60
MAX_OPTION_SOFT = 42


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def fail(msg: str):
    print(f"ERROR: {msg}")


def validate_card(card: dict, idx: int):
    errors = []
    warnings = []

    required = ["id", "topic", "category", "language", "question", "options", "correct"]
    for key in required:
        if key not in card:
            errors.append(f"card[{idx}] missing field '{key}'")

    if errors:
        return errors, warnings

    if card["topic"] not in TOPICS:
        errors.append(f"card[{idx}] invalid topic {card['topic']}")
    if card["category"] not in CATEGORIES:
        errors.append(f"card[{idx}] invalid category {card['category']}")

    options = card["options"]
    if not isinstance(options, list) or len(options) != 10:
        errors.append(f"card[{idx}] must have exactly 10 options")
        return errors, warnings

    for opt_i, option in enumerate(options):
        if not isinstance(option, str) or not option.strip():
            errors.append(f"card[{idx}] option[{opt_i}] is empty")
            continue
        if len(option) > MAX_OPTION_HARD:
            errors.append(f"card[{idx}] option[{opt_i}] too long ({len(option)} > {MAX_OPTION_HARD})")
        elif len(option) > MAX_OPTION_SOFT:
            warnings.append(f"card[{idx}] option[{opt_i}] above soft limit ({len(option)} > {MAX_OPTION_SOFT})")

    if len({norm(o) for o in options}) < 10:
        errors.append(f"card[{idx}] has duplicate options")

    correct = card["correct"]
    if not isinstance(correct, dict):
        errors.append(f"card[{idx}] correct must be object")
        return errors, warnings

    category = card["category"]
    if category == "TRUE_FALSE":
        indexes = correct.get("correctIndexes")
        if not isinstance(indexes, list) or not indexes:
            errors.append(f"card[{idx}] TRUE_FALSE requires non-empty correctIndexes")
        else:
            ints = [x for x in indexes if isinstance(x, int) and 0 <= x < 10]
            if len(ints) != len(indexes):
                errors.append(f"card[{idx}] TRUE_FALSE correctIndexes must be 0..9")
    elif category == "ORDER":
        order = correct.get("correctOrder")
        if not isinstance(order, list) or len(order) != 10:
            errors.append(f"card[{idx}] ORDER requires correctOrder length 10")
        else:
            if sorted(order) != list(range(1, 11)):
                errors.append(f"card[{idx}] ORDER correctOrder must be permutation 1..10")
    else:
        if not isinstance(correct.get("correctIndex"), int):
            errors.append(f"card[{idx}] {category} requires correctIndex int")
        elif not (0 <= correct["correctIndex"] < 10):
            errors.append(f"card[{idx}] {category} correctIndex out of range")

    return errors, warnings


def main():
    parser = argparse.ArgumentParser(description="Validate Smart10 cards dataset")
    parser.add_argument("path", type=Path, help="Path to cards.en.json")
    parser.add_argument("--min-per-pair", type=int, default=30)
    args = parser.parse_args()

    if not args.path.exists():
        fail(f"file does not exist: {args.path}")
        return 1

    cards = json.loads(args.path.read_text(encoding="utf-8"))
    if not isinstance(cards, list):
        fail("dataset root must be an array")
        return 1

    errors = []
    warnings = []
    ids = set()
    question_keys = set()
    tf_counts = []
    per_pair = Counter()

    for i, card in enumerate(cards):
        card_errors, card_warnings = validate_card(card, i)
        errors.extend(card_errors)
        warnings.extend(card_warnings)

        card_id = card.get("id")
        if card_id:
            if card_id in ids:
                errors.append(f"duplicate id: {card_id}")
            ids.add(card_id)

        question_key = (card.get("topic"), card.get("category"), norm(str(card.get("question", ""))))
        if question_key in question_keys:
            warnings.append(f"near-duplicate question in pair: {question_key[0]}/{question_key[1]}")
        question_keys.add(question_key)

        topic = card.get("topic")
        category = card.get("category")
        if topic and category:
            per_pair[(topic, category)] += 1

        if card.get("category") == "TRUE_FALSE" and isinstance(card.get("correct"), dict):
            idxs = card["correct"].get("correctIndexes", [])
            if isinstance(idxs, list):
                tf_counts.append(len(idxs))

    for topic in TOPICS:
        for category in CATEGORIES:
            count = per_pair[(topic, category)]
            if count < args.min_per_pair:
                errors.append(f"insufficient cards for {topic}/{category}: {count} < {args.min_per_pair}")

    if tf_counts:
        heavy = sum(1 for c in tf_counts if c >= 8)
        single = sum(1 for c in tf_counts if c == 1)
        if heavy > max(2, len(tf_counts) // 10):
            errors.append("TRUE_FALSE distribution unhealthy: too many cards with >=8 truths")
        if single > max(8, len(tf_counts) // 3):
            warnings.append("TRUE_FALSE distribution skewed toward single-correct cards")

    print(f"Validated {len(cards)} cards")
    print(f"Pairs: {len(per_pair)}")
    if warnings:
        print(f"Warnings: {len(warnings)}")
        for w in warnings[:30]:
            print(f"WARN: {w}")

    if errors:
        print(f"Errors: {len(errors)}")
        for e in errors[:60]:
            fail(e)
        return 1

    print("Validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
