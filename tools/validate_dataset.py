#!/usr/bin/env python3
"""
Validate SmartIQ generated dataset under out/.
Exits non-zero on any gate failure.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

TOPICS = [
    "Culture",
    "History",
    "Geography",
    "Science",
    "Sports",
    "Technology",
    "Art",
    "Music",
    "Politics",
    "Nature",
]

CATEGORIES = [
    "TRUE_FALSE",
    "NUMBER",
    "ORDER",
    "CENTURY_DECADE",
    "COLOR",
    "OPEN",
]

CANONICAL_COLORS = {
    "black",
    "white",
    "red",
    "green",
    "blue",
    "yellow",
    "orange",
    "purple",
    "pink",
    "brown",
    "gray",
}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", "", text.lower())).strip()


def topic_key(topic: str) -> str:
    return normalize(topic).replace(" ", "_")


def category_key(category: str) -> str:
    return normalize(category).replace(" ", "_")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def card_signature(topic: str, category: str, card: dict) -> str:
    question = normalize(card.get("question", ""))
    entries = []
    for opt in card.get("options", []):
        if category == "OPEN":
            entries.append(f"{normalize(str(opt.get('prompt', '')))}|{normalize(str(opt.get('answer', '')))}")
        elif category == "NUMBER":
            entries.append(f"{normalize(str(opt.get('text', '')))}|{opt.get('value')}")
        elif category == "ORDER":
            entries.append(f"{normalize(str(opt.get('text', '')))}|{opt.get('position')}")
        elif category == "CENTURY_DECADE":
            if "correctCentury" in opt:
                entries.append(f"{normalize(str(opt.get('text', '')))}|c{opt.get('correctCentury')}")
            else:
                entries.append(f"{normalize(str(opt.get('text', '')))}|d{opt.get('correctDecade')}")
        elif category == "COLOR":
            entries.append(f"{normalize(str(opt.get('text', '')))}|{normalize(str(opt.get('correctColor', '')))}")
        else:
            entries.append(f"{normalize(str(opt.get('text', '')))}|{opt.get('correct')}")
    entries.sort()
    return f"{topic_key(topic)}|{category_key(category)}|{question}|{'|'.join(entries)}"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def validate(out_dir: Path) -> int:
    errors = []

    summary = []
    global_id_seen = set()
    global_id_dups = 0

    expected_files = {f"{t.lower()}.json" for t in TOPICS}
    actual_files = {p.name for p in out_dir.glob("*.json") if p.name != "index.json"}
    missing = sorted(expected_files - actual_files)
    extra = sorted(actual_files - expected_files)
    if missing:
        errors.append(f"Missing topic files: {missing}")
    if extra:
        errors.append(f"Unexpected topic files: {extra}")

    for topic in TOPICS:
        path = out_dir / f"{topic.lower()}.json"
        if not path.exists():
            continue

        try:
            payload = load_json(path)
        except Exception as exc:
            errors.append(f"Invalid JSON: {path} ({exc})")
            continue

        if not isinstance(payload, list) or len(payload) != 6:
            errors.append(f"{path}: must be array of 6 blocks")
            continue

        block_map = {}
        for block in payload:
            bt = block.get("topic")
            bc = block.get("category")
            if bt != topic:
                errors.append(f"{path}: block topic mismatch ({bt} != {topic})")
            if bc in block_map:
                errors.append(f"{path}: duplicate category block {bc}")
            block_map[bc] = block

        for category in CATEGORIES:
            if category not in block_map:
                errors.append(f"{path}: missing category block {category}")
                continue

            cards = block_map[category].get("cards")
            if not isinstance(cards, list) or len(cards) != 250:
                errors.append(f"{topic}/{category}: expected 250 cards")
                continue

            sig_seen = set()
            sig_dups = 0
            option_dup_total = 0
            difficulty = Counter()
            tf_true_counts = Counter()

            for card in cards:
                cid = card.get("id")
                if not isinstance(cid, str):
                    errors.append(f"{topic}/{category}: card missing id")
                    continue
                expect_prefix = f"{topic_key(topic)}_{category_key(category)}_"
                if not cid.startswith(expect_prefix):
                    errors.append(f"{topic}/{category}: id prefix mismatch ({cid})")
                if cid in global_id_seen:
                    global_id_dups += 1
                global_id_seen.add(cid)

                d = card.get("difficulty")
                if d not in {1, 2, 3}:
                    errors.append(f"{cid}: invalid difficulty")
                else:
                    difficulty[d] += 1

                if card.get("language") != "en":
                    errors.append(f"{cid}: language must be en")

                options = card.get("options")
                if not isinstance(options, list) or len(options) != 10:
                    errors.append(f"{cid}: options must be length 10")
                    continue

                option_ids = sorted(o.get("id") for o in options)
                if option_ids != list(range(1, 11)):
                    errors.append(f"{cid}: option ids must be 1..10 unique")

                normalized_local = set()
                for opt in options:
                    if category == "OPEN":
                        key_text = normalize(str(opt.get("prompt", "")))
                    else:
                        key_text = normalize(str(opt.get("text", "")))
                    if key_text in normalized_local:
                        option_dup_total += 1
                    normalized_local.add(key_text)

                    if category == "TRUE_FALSE":
                        if set(opt.keys()) != {"id", "text", "correct"}:
                            errors.append(f"{cid}: true_false option shape invalid")
                    elif category == "NUMBER":
                        if set(opt.keys()) != {"id", "text", "value"} or not isinstance(opt.get("value"), int):
                            errors.append(f"{cid}: number option shape/value invalid")
                    elif category == "ORDER":
                        if set(opt.keys()) != {"id", "text", "position"}:
                            errors.append(f"{cid}: order option shape invalid")
                    elif category == "CENTURY_DECADE":
                        has_c = "correctCentury" in opt
                        has_d = "correctDecade" in opt
                        if has_c == has_d:
                            errors.append(f"{cid}: century_decade option must have exactly one key")
                    elif category == "COLOR":
                        if set(opt.keys()) != {"id", "text", "correctColor"}:
                            errors.append(f"{cid}: color option shape invalid")
                        elif opt.get("correctColor") not in CANONICAL_COLORS:
                            errors.append(f"{cid}: non-canonical color")
                    elif category == "OPEN":
                        if set(opt.keys()) != {"id", "prompt", "answer"}:
                            errors.append(f"{cid}: open option shape invalid")
                        elif not str(opt.get("answer", "")).strip():
                            errors.append(f"{cid}: open answer blank")

                if category == "ORDER":
                    positions = sorted(o.get("position") for o in options)
                    if positions != list(range(1, 11)):
                        errors.append(f"{cid}: order positions must be 1..10 unique")

                if category == "CENTURY_DECADE":
                    has_century = [("correctCentury" in o) for o in options]
                    if not all(has_century) and any(has_century):
                        errors.append(f"{cid}: mixed century/decade in same card")

                if category == "TRUE_FALSE":
                    bits = [bool(o.get("correct")) for o in options]
                    if all(bits) or not any(bits):
                        errors.append(f"{cid}: true_false must include both true and false")
                    alternating = True
                    for i in range(1, len(bits)):
                        if bits[i] == bits[i - 1]:
                            alternating = False
                            break
                    if alternating:
                        errors.append(f"{cid}: alternating true/false pattern disallowed")
                    tf_true_counts[sum(1 for b in bits if b)] += 1

                sig = card_signature(topic, category, card)
                if sig in sig_seen:
                    sig_dups += 1
                sig_seen.add(sig)

            if difficulty[1] != 75 or difficulty[2] != 100 or difficulty[3] != 75:
                errors.append(
                    f"{topic}/{category}: difficulty mismatch "
                    f"(d1={difficulty[1]}, d2={difficulty[2]}, d3={difficulty[3]})"
                )
            if category == "TRUE_FALSE" and len(tf_true_counts) < 4:
                errors.append(f"{topic}/{category}: low variability in true-count distribution")

            summary.append(
                {
                    "topic": topic,
                    "category": category,
                    "cards": len(cards),
                    "d1": difficulty[1],
                    "d2": difficulty[2],
                    "d3": difficulty[3],
                    "signature_dups": sig_dups,
                    "option_text_dups_in_cards": option_dup_total,
                }
            )

    if global_id_dups:
        errors.append(f"Global duplicate card IDs: {global_id_dups}")

    index_path = out_dir / "index.json"
    if index_path.exists():
        try:
            idx = load_json(index_path)
            idx_entries = idx.get("topics", [])
            for entry in idx_entries:
                p = Path(entry.get("file", ""))
                sha = entry.get("sha256")
                if p.exists():
                    actual_sha = sha256_file(p)
                    if sha != actual_sha:
                        errors.append(f"Checksum mismatch for {p}: {sha} != {actual_sha}")
        except Exception as exc:
            errors.append(f"Invalid index.json ({exc})")

    print("SmartIQ dataset validation summary")
    print(f"out_dir={out_dir}")
    print(f"topic_category_blocks={len(summary)}")
    for row in sorted(summary, key=lambda r: (r["topic"], r["category"])):
        print(
            f"{row['topic']}/{row['category']}: cards={row['cards']} "
            f"d1={row['d1']} d2={row['d2']} d3={row['d3']} "
            f"sig_dups={row['signature_dups']} option_dups={row['option_text_dups_in_cards']}"
        )

    if errors:
        print("\nVALIDATION FAILED")
        for e in errors:
            print(f"- {e}")
        return 1

    print("\nVALIDATION PASSED")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate SmartIQ dataset outputs")
    parser.add_argument("--out-dir", type=Path, default=Path("out"), help="Output directory")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    sys.exit(validate(args.out_dir))


if __name__ == "__main__":
    main()
