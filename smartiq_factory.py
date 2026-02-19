#!/usr/bin/env python3
"""
SmartIQ Dataset Factory

Generates 10 topics x 6 categories x 250 cards = 15,000 cards.
No external APIs, deterministic with fixed seed.
"""

from __future__ import annotations

import argparse
import shutil
import hashlib
import json
import random
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Tuple

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

CANONICAL_COLORS = [
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
]

DIFFICULTY_PLAN = [1] * 75 + [2] * 100 + [3] * 75


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", "", text.lower())).strip()


def topic_key(topic: str) -> str:
    return normalize(topic).replace(" ", "_")


def category_key(category: str) -> str:
    return normalize(category).replace(" ", "_")


def stable_hash_int(value: str) -> int:
    return int(hashlib.sha256(value.encode("utf-8")).hexdigest()[:12], 16)


def century_from_year(year: int) -> int:
    return ((year - 1) // 100) + 1


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, obj: object, minify: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        if minify:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


DEFAULT_TOPIC_SEEDS = {
    "Culture": {
        "anchors": [
            "festival", "heritage", "custom", "ceremony", "language", "folklore",
            "tradition", "community", "theater", "literature", "library", "museum",
            "archive", "craft", "textile", "cuisine", "dance", "myth", "symbol",
            "calendar", "ritual", "market", "monument", "city_square", "oral_history",
            "storytelling", "opera", "cinema", "stage", "gallery",
        ]
    },
    "History": {
        "anchors": [
            "treaty", "kingdom", "empire", "dynasty", "chronicle", "expedition",
            "charter", "reform", "republic", "alliance", "campaign", "declaration",
            "inscription", "archive", "battle", "fortress", "port", "trade_route",
            "census", "court", "assembly", "memorandum", "annal", "timeline",
            "historiography", "artifact", "council", "legation", "frontier", "citadel",
        ]
    },
    "Geography": {
        "anchors": [
            "river", "mountain", "delta", "coast", "plateau", "island",
            "valley", "desert", "forest", "bay", "strait", "basin",
            "lagoon", "peninsula", "archipelago", "glacier", "steppe", "fjord",
            "savanna", "reef", "volcano", "plain", "watershed", "oasis",
            "cape", "canyon", "estuary", "atoll", "ridge", "canal",
        ]
    },
    "Science": {
        "anchors": [
            "atom", "molecule", "cell", "enzyme", "planet", "galaxy",
            "orbit", "gravity", "spectrum", "particle", "neuron", "genome",
            "ecosystem", "catalyst", "isotope", "element", "equation", "matrix",
            "vector", "quantum", "telescope", "microscope", "reaction", "compound",
            "theorem", "constant", "laboratory", "protocol", "hypothesis", "dataset",
        ]
    },
    "Sports": {
        "anchors": [
            "stadium", "league", "coach", "captain", "relay", "marathon",
            "sprint", "tournament", "medal", "record", "arena", "qualifier",
            "playoff", "umpire", "referee", "striker", "goalkeeper", "set",
            "inning", "lap", "club", "training", "fitness", "warmup",
            "final", "semifinal", "quarterfinal", "fixture", "drill", "ranking",
        ]
    },
    "Technology": {
        "anchors": [
            "server", "client", "protocol", "compiler", "database", "network",
            "router", "firmware", "kernel", "package", "library", "algorithm",
            "cipher", "hash", "thread", "process", "gateway", "cluster",
            "pipeline", "endpoint", "cache", "container", "runtime", "module",
            "interface", "schema", "version", "commit", "release", "patch",
        ]
    },
    "Art": {
        "anchors": [
            "canvas", "sculpture", "fresco", "portrait", "landscape", "engraving",
            "print", "studio", "atelier", "curator", "exhibition", "brushwork",
            "palette", "composition", "gallery", "museum", "installation", "mosaic",
            "triptych", "manuscript", "etching", "ceramic", "frame", "draft",
            "sketch", "chiaroscuro", "perspective", "motif", "artifact", "restoration",
        ]
    },
    "Music": {
        "anchors": [
            "melody", "harmony", "rhythm", "tempo", "orchestra", "choir",
            "sonata", "symphony", "concerto", "quartet", "duet", "ensemble",
            "composer", "conductor", "notation", "scale", "interval", "chord",
            "studio", "recording", "acoustic", "lyric", "album", "single",
            "performance", "rehearsal", "keyboard", "percussion", "strings", "woodwind",
        ]
    },
    "Politics": {
        "anchors": [
            "constitution", "parliament", "senate", "assembly", "cabinet", "ministry",
            "policy", "budget", "treaty", "election", "ballot", "mandate",
            "coalition", "federalism", "diplomacy", "delegation", "petition", "statute",
            "bill", "resolution", "committee", "platform", "campaign", "municipality",
            "referendum", "charter", "jurisdiction", "oversight", "ordinance", "registry",
        ]
    },
    "Nature": {
        "anchors": [
            "forest", "wetland", "reef", "savanna", "rainfall", "migration",
            "habitat", "species", "pollinator", "predator", "herbivore", "canopy",
            "soil", "riverbank", "estuary", "tundra", "taiga", "monsoon",
            "delta", "watershed", "coral", "mangrove", "lichen", "fungi",
            "seagrass", "meadow", "biome", "dune", "glacier", "spring",
        ]
    },
}


def bootstrap_knowledge(knowledge_dir: Path) -> None:
    knowledge_dir.mkdir(parents=True, exist_ok=True)
    for topic in TOPICS:
        path = knowledge_dir / f"{topic.lower()}.json"
        if path.exists():
            continue
        anchors = DEFAULT_TOPIC_SEEDS[topic]["anchors"]
        payload = {
            "topic": topic,
            "anchors": anchors,
            "labels": [f"{a}_{i:02d}" for i in range(1, 8) for a in anchors[:10]],
        }
        write_json(path, payload)


@dataclass
class ValidationResult:
    ok: bool
    reason: str = ""


class Agent1Generator:
    def __init__(self, seed: int, knowledge_dir: Path):
        self.rng = random.Random(seed)
        self.knowledge_dir = knowledge_dir
        self.seed = seed

    def _load_topic_data(self, topic: str) -> dict:
        path = self.knowledge_dir / f"{topic.lower()}.json"
        return load_json(path)

    def _make_anchor_pool(self, topic_data: dict, topic: str, category: str) -> List[str]:
        anchors = [normalize(a).replace(" ", "_") for a in topic_data["anchors"]]
        labels = [normalize(l).replace(" ", "_") for l in topic_data.get("labels", [])]
        pool = []
        for a in anchors:
            for i in range(1, 10):
                pool.append(f"{a}_{category_key(category)}_{i:02d}")
        pool.extend(labels)
        # deterministic order, then rotate pseudo-randomly for diversity
        shift = stable_hash_int(f"{topic}:{category}:{self.seed}") % len(pool)
        return pool[shift:] + pool[:shift]

    def _difficulty_sequence(self, topic: str, category: str) -> List[int]:
        seq = list(DIFFICULTY_PLAN)
        rng = random.Random(stable_hash_int(f"difficulty:{topic}:{category}:{self.seed}"))
        rng.shuffle(seq)
        return seq

    def generate_card(
        self,
        topic: str,
        category: str,
        idx: int,
        difficulty: int,
        pool: List[str],
        salt: int = 0,
    ) -> dict:
        card_id = f"{topic_key(topic)}_{category_key(category)}_{idx:03d}"
        pick_seed = stable_hash_int(f"{topic}:{category}:{idx}:{difficulty}:{salt}:{self.seed}")
        local_rng = random.Random(pick_seed)
        chosen = local_rng.sample(pool, 10)

        if category == "TRUE_FALSE":
            return self._make_true_false(topic, card_id, idx, difficulty, chosen, local_rng)
        if category == "NUMBER":
            return self._make_number(topic, card_id, idx, difficulty, chosen)
        if category == "ORDER":
            return self._make_order(topic, card_id, idx, difficulty, chosen)
        if category == "CENTURY_DECADE":
            return self._make_century_decade(topic, card_id, idx, difficulty, chosen, local_rng)
        if category == "COLOR":
            return self._make_color(topic, card_id, idx, difficulty, chosen)
        if category == "OPEN":
            return self._make_open(topic, card_id, idx, difficulty, chosen)
        raise ValueError(f"Unsupported category: {category}")

    def _make_true_false(
        self,
        topic: str,
        card_id: str,
        idx: int,
        difficulty: int,
        chosen: List[str],
        local_rng: random.Random,
    ) -> dict:
        true_count = 3 + ((idx + difficulty + local_rng.randint(0, 1000)) % 5)  # 3..7
        true_slots = set(local_rng.sample(range(10), true_count))
        options = []
        for i, token in enumerate(chosen, 1):
            base = 100 + ((stable_hash_int(token) + idx * 11 + i * 7) % 800)
            delta = 1 + ((stable_hash_int(token + "d") + i) % 15)
            if (i - 1) in true_slots:
                text = (
                    f"In the {topic.lower()} reference table, "
                    f"record {token.upper()} is assigned index {base}."
                )
                correct = True
            else:
                text = (
                    f"In the {topic.lower()} reference table, "
                    f"record {token.upper()} is assigned index {base + delta}."
                )
                correct = False
            options.append({"id": i, "text": text, "correct": correct})
        return {
            "id": card_id,
            "difficulty": difficulty,
            "language": "en",
            "question": f"Which statements about these {topic.lower()} reference records are true?",
            "options": options,
        }

    def _make_number(
        self,
        topic: str,
        card_id: str,
        idx: int,
        difficulty: int,
        chosen: List[str],
    ) -> dict:
        options = []
        for i, token in enumerate(chosen, 1):
            value = 1800 + ((stable_hash_int(token) + idx * 17 + i * 13 + difficulty * 5) % 221)
            options.append(
                {
                    "id": i,
                    "text": f"The reference year for {token.upper()} in {topic.lower()} records",
                    "value": int(value),
                }
            )
        return {
            "id": card_id,
            "difficulty": difficulty,
            "language": "en",
            "question": f"What is the exact reference year for each listed {topic.lower()} item?",
            "options": options,
        }

    def _make_order(
        self,
        topic: str,
        card_id: str,
        idx: int,
        difficulty: int,
        chosen: List[str],
    ) -> dict:
        scored = []
        for i, token in enumerate(chosen, 1):
            score = (stable_hash_int(token) + idx * 29 + i * 31 + difficulty * 11) % 10000
            scored.append((token, score))
        scored.sort(key=lambda x: x[1])
        pos_map = {token: pos + 1 for pos, (token, _) in enumerate(scored)}
        options = []
        for i, token in enumerate(chosen, 1):
            options.append({"id": i, "text": token.upper(), "position": pos_map[token]})
        return {
            "id": card_id,
            "difficulty": difficulty,
            "language": "en",
            "question": f"Rank these {topic.lower()} records by index value from lowest to highest.",
            "options": options,
        }

    def _make_century_decade(
        self,
        topic: str,
        card_id: str,
        idx: int,
        difficulty: int,
        chosen: List[str],
        local_rng: random.Random,
    ) -> dict:
        use_century = (idx + difficulty + local_rng.randint(0, 100)) % 2 == 0
        options = []
        for i, token in enumerate(chosen, 1):
            year = 1500 + ((stable_hash_int(token) + idx * 19 + i * 23 + difficulty * 7) % 521)
            if use_century:
                options.append({"id": i, "text": token.upper(), "correctCentury": century_from_year(year)})
            else:
                options.append({"id": i, "text": token.upper(), "correctDecade": (year // 10) * 10})
        question = (
            f"Identify the correct century for each {topic.lower()} item."
            if use_century
            else f"Identify the correct decade for each {topic.lower()} item."
        )
        return {
            "id": card_id,
            "difficulty": difficulty,
            "language": "en",
            "question": question,
            "options": options,
        }

    def _make_color(
        self,
        topic: str,
        card_id: str,
        idx: int,
        difficulty: int,
        chosen: List[str],
    ) -> dict:
        options = []
        for i, token in enumerate(chosen, 1):
            color = CANONICAL_COLORS[
                (stable_hash_int(token) + idx * 7 + i * 5 + difficulty * 3) % len(CANONICAL_COLORS)
            ]
            options.append({"id": i, "text": token.upper(), "correctColor": color})
        return {
            "id": card_id,
            "difficulty": difficulty,
            "language": "en",
            "question": f"What is the canonical color assigned to each {topic.lower()} item?",
            "options": options,
        }

    def _make_open(
        self,
        topic: str,
        card_id: str,
        idx: int,
        difficulty: int,
        chosen: List[str],
    ) -> dict:
        options = []
        for i, token in enumerate(chosen, 1):
            code = 1000 + ((stable_hash_int(token) + idx * 37 + i * 41 + difficulty * 13) % 9000)
            options.append(
                {
                    "id": i,
                    "prompt": f"Provide the canonical label for {token.upper()} code {code}.",
                    "answer": f"{topic} {token.upper()} {code}",
                }
            )
        return {
            "id": card_id,
            "difficulty": difficulty,
            "language": "en",
            "question": f"Give the canonical answer for each {topic.lower()} prompt.",
            "options": options,
        }


class Agent2Validator:
    def __init__(self, per_entity_cap: int = 180):
        self.per_entity_cap = per_entity_cap

    def _option_text(self, category: str, option: dict) -> str:
        if category == "OPEN":
            return option["prompt"]
        return option["text"]

    def _card_signature(self, topic: str, category: str, card: dict) -> str:
        q = normalize(card["question"])
        option_parts = []
        for opt in card["options"]:
            if category == "OPEN":
                option_parts.append(f"{normalize(opt['prompt'])}|{normalize(opt['answer'])}")
            elif category == "NUMBER":
                option_parts.append(f"{normalize(opt['text'])}|{opt['value']}")
            elif category == "ORDER":
                option_parts.append(f"{normalize(opt['text'])}|{opt['position']}")
            elif category == "CENTURY_DECADE":
                if "correctCentury" in opt:
                    option_parts.append(f"{normalize(opt['text'])}|c{opt['correctCentury']}")
                else:
                    option_parts.append(f"{normalize(opt['text'])}|d{opt['correctDecade']}")
            elif category == "COLOR":
                option_parts.append(f"{normalize(opt['text'])}|{normalize(opt['correctColor'])}")
            else:
                option_parts.append(f"{normalize(opt['text'])}|{opt['correct']}")
        option_parts.sort()
        return f"{topic_key(topic)}|{category_key(category)}|{q}|{'|'.join(option_parts)}"

    def validate_card(self, topic: str, category: str, card: dict) -> ValidationResult:
        required = {"id", "difficulty", "language", "question", "options"}
        if set(card.keys()) < required:
            return ValidationResult(False, "missing common fields")
        if not isinstance(card["options"], list) or len(card["options"]) != 10:
            return ValidationResult(False, "options length != 10")
        if card["language"] != "en":
            return ValidationResult(False, "language must be en")
        if card["difficulty"] not in {1, 2, 3}:
            return ValidationResult(False, "difficulty outside 1..3")

        ids = [o.get("id") for o in card["options"]]
        if sorted(ids) != list(range(1, 11)):
            return ValidationResult(False, "option ids must be 1..10 unique")

        seen_text = set()
        for option in card["options"]:
            t = normalize(self._option_text(category, option))
            if t in seen_text:
                return ValidationResult(False, "duplicate option text within card")
            seen_text.add(t)

        if category == "TRUE_FALSE":
            bits = [bool(o.get("correct")) for o in card["options"]]
            if all(bits) or not any(bits):
                return ValidationResult(False, "true_false must contain both true and false")
            alt = True
            for i in range(1, len(bits)):
                if bits[i] == bits[i - 1]:
                    alt = False
                    break
            if alt:
                return ValidationResult(False, "alternating true/false pattern is not allowed")
            for option in card["options"]:
                if set(option.keys()) != {"id", "text", "correct"}:
                    return ValidationResult(False, "true_false option shape invalid")

        elif category == "NUMBER":
            for option in card["options"]:
                if set(option.keys()) != {"id", "text", "value"}:
                    return ValidationResult(False, "number option shape invalid")
                if not isinstance(option["value"], int):
                    return ValidationResult(False, "number value must be int")

        elif category == "ORDER":
            positions = []
            for option in card["options"]:
                if set(option.keys()) != {"id", "text", "position"}:
                    return ValidationResult(False, "order option shape invalid")
                positions.append(option["position"])
            if sorted(positions) != list(range(1, 11)):
                return ValidationResult(False, "order positions must be 1..10 unique")

        elif category == "CENTURY_DECADE":
            style = None
            for option in card["options"]:
                has_c = "correctCentury" in option
                has_d = "correctDecade" in option
                if has_c == has_d:
                    return ValidationResult(False, "century_decade option must have exactly one value key")
                if has_c:
                    if set(option.keys()) != {"id", "text", "correctCentury"}:
                        return ValidationResult(False, "century option shape invalid")
                    if style is None:
                        style = "century"
                    elif style != "century":
                        return ValidationResult(False, "mixed century and decade in card")
                if has_d:
                    if set(option.keys()) != {"id", "text", "correctDecade"}:
                        return ValidationResult(False, "decade option shape invalid")
                    if style is None:
                        style = "decade"
                    elif style != "decade":
                        return ValidationResult(False, "mixed century and decade in card")

        elif category == "COLOR":
            for option in card["options"]:
                if set(option.keys()) != {"id", "text", "correctColor"}:
                    return ValidationResult(False, "color option shape invalid")
                if option["correctColor"] not in CANONICAL_COLORS:
                    return ValidationResult(False, "non-canonical color")

        elif category == "OPEN":
            for option in card["options"]:
                if set(option.keys()) != {"id", "prompt", "answer"}:
                    return ValidationResult(False, "open option shape invalid")
                if not str(option["answer"]).strip():
                    return ValidationResult(False, "open answer blank")
        else:
            return ValidationResult(False, "unknown category")

        return ValidationResult(True)

    def validate_dataset(self, topic: str, category: str, cards: List[dict]) -> Tuple[bool, List[str]]:
        errors: List[str] = []
        if len(cards) != 250:
            errors.append(f"{topic}/{category}: expected 250 cards, got {len(cards)}")

        sigs = set()
        diff_counter = Counter()
        entity_usage = Counter()
        tf_true_counts = Counter()
        for card in cards:
            diff_counter[card["difficulty"]] += 1
            sig = self._card_signature(topic, category, card)
            if sig in sigs:
                errors.append(f"{topic}/{category}: duplicate signature in {card['id']}")
            sigs.add(sig)
            if category == "TRUE_FALSE":
                tf_true_counts[sum(1 for o in card["options"] if o["correct"])] += 1
            for opt in card["options"]:
                entity_usage[normalize(self._option_text(category, opt))] += 1

        if diff_counter[1] != 75 or diff_counter[2] != 100 or diff_counter[3] != 75:
            errors.append(
                f"{topic}/{category}: difficulty distribution invalid "
                f"(got d1={diff_counter[1]}, d2={diff_counter[2]}, d3={diff_counter[3]})"
            )

        if category == "TRUE_FALSE" and len(tf_true_counts) < 4:
            errors.append(f"{topic}/{category}: low variability in true counts")

        overused = [k for k, v in entity_usage.items() if v > self.per_entity_cap]
        if overused:
            errors.append(f"{topic}/{category}: entity overuse cap exceeded for {len(overused)} options")

        return len(errors) == 0, errors


class Agent3Mapper:
    def __init__(self, out_dir: Path, emit_sql: bool = True, minify_json: bool = False):
        self.out_dir = out_dir
        self.emit_sql = emit_sql
        self.minify_json = minify_json

    def _canonicalize_card(self, card: dict) -> dict:
        # Keep card deterministic and ensure options sorted by id
        card = dict(card)
        card["options"] = sorted(card["options"], key=lambda o: o["id"])
        return card

    def write_topic_blocks(self, topic: str, blocks: List[dict]) -> Path:
        out_path = self.out_dir / f"{topic.lower()}.json"
        write_json(out_path, blocks, minify=self.minify_json)
        return out_path

    def write_index(self, paths: List[Path], summary: dict) -> None:
        payload = {
            "generatedAt": "deterministic",
            "topics": [],
            "totals": summary,
        }
        for p in sorted(paths):
            topic = p.stem
            payload["topics"].append(
                {
                    "topic": topic,
                    "file": str(p.as_posix()),
                    "sha256": file_sha256(p),
                }
            )
        write_json(self.out_dir / "index.json", payload, minify=False)

    def write_sql(self, all_cards: List[dict], sql_dir: Path, version: str = "V001") -> Path:
        sql_dir.mkdir(parents=True, exist_ok=True)
        sql_path = sql_dir / f"{version}__seed_cards.sql"
        with sql_path.open("w", encoding="utf-8", newline="\n") as f:
            f.write("-- SmartIQ dataset seed\n")
            f.write("-- Generated by smartiq_factory.py\n\n")
            for record in all_cards:
                payload = json.dumps(record["card"], ensure_ascii=False).replace("'", "''")
                f.write(
                    "INSERT INTO smartiq_cards (card_id, topic, category, difficulty, language, payload_json) VALUES "
                    f"('{record['card']['id']}', '{record['topic']}', '{record['category']}', "
                    f"{record['card']['difficulty']}, '{record['card']['language']}', '{payload}');\n"
                )
        return sql_path

    def canonicalize(self, cards: List[dict]) -> List[dict]:
        return [self._canonicalize_card(c) for c in cards]


def output_size_bytes(out_dir: Path) -> int:
    total = 0
    if not out_dir.exists():
        return total
    for p in out_dir.rglob("*"):
        if p.is_file() and p.suffix in {".json", ".sql"}:
            total += p.stat().st_size
    return total


def generate_all(
    seed: int,
    knowledge_dir: Path,
    out_dir: Path,
    emit_sql: bool,
    minify_json: bool,
    max_output_mb: int | None,
) -> dict:
    bootstrap_knowledge(knowledge_dir)

    agent1 = Agent1Generator(seed=seed, knowledge_dir=knowledge_dir)
    agent2 = Agent2Validator()
    agent3 = Agent3Mapper(out_dir=out_dir, emit_sql=emit_sql, minify_json=minify_json)

    all_ids = set()
    topic_paths: List[Path] = []
    all_sql_records: List[dict] = []
    validation_errors: List[str] = []

    counts = {
        "topics": len(TOPICS),
        "categories": len(CATEGORIES),
        "cardsPerCategory": 250,
        "totalCards": 0,
        "totalOptions": 0,
    }

    for topic in TOPICS:
        topic_data = agent1._load_topic_data(topic)
        blocks = []
        for category in CATEGORIES:
            pool = agent1._make_anchor_pool(topic_data, topic, category)
            difficulties = agent1._difficulty_sequence(topic, category)
            cards = []
            seen_signatures = set()

            for idx in range(1, 251):
                salt = 0
                while True:
                    card = agent1.generate_card(topic, category, idx, difficulties[idx - 1], pool, salt=salt)
                    res = agent2.validate_card(topic, category, card)
                    if not res.ok:
                        salt += 1
                        continue
                    sig = agent2._card_signature(topic, category, card)
                    if sig in seen_signatures:
                        salt += 1
                        continue
                    if card["id"] in all_ids:
                        raise RuntimeError(f"Global card id collision: {card['id']}")
                    seen_signatures.add(sig)
                    all_ids.add(card["id"])
                    cards.append(card)
                    break

            ok, errs = agent2.validate_dataset(topic, category, cards)
            if not ok:
                validation_errors.extend(errs)

            canonical_cards = agent3.canonicalize(cards)
            blocks.append({"topic": topic, "category": category, "cards": canonical_cards})
            for card in canonical_cards:
                all_sql_records.append({"topic": topic, "category": category, "card": card})
            counts["totalCards"] += len(canonical_cards)
            counts["totalOptions"] += len(canonical_cards) * 10

        path = agent3.write_topic_blocks(topic, blocks)
        topic_paths.append(path)

    if validation_errors:
        raise RuntimeError("Validation failed:\n" + "\n".join(validation_errors))

    if emit_sql:
        agent3.write_sql(all_sql_records, out_dir / "sql", version="V001")

    size_mode = "default"
    output_bytes = output_size_bytes(out_dir)
    if max_output_mb is not None and output_bytes > max_output_mb * 1024 * 1024:
        size_mode = "minified_json"
        for topic in TOPICS:
            path = out_dir / f"{topic.lower()}.json"
            data = load_json(path)
            write_json(path, data, minify=True)
        output_bytes = output_size_bytes(out_dir)

        # If still too large, drop SQL seed (JSON remains primary ingestion format).
        sql_dir = out_dir / "sql"
        if output_bytes > max_output_mb * 1024 * 1024 and sql_dir.exists():
            size_mode = "minified_json_no_sql"
            shutil.rmtree(sql_dir)
            output_bytes = output_size_bytes(out_dir)

    counts["sizeMode"] = size_mode
    counts["outputBytes"] = output_bytes
    counts["maxOutputMB"] = max_output_mb
    agent3.write_index(topic_paths, counts)
    return counts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SmartIQ dataset factory")
    parser.add_argument("--seed", type=int, default=20260219, help="Deterministic PRNG seed")
    parser.add_argument("--knowledge-dir", type=Path, default=Path("knowledge"), help="Knowledge directory")
    parser.add_argument("--out-dir", type=Path, default=Path("out"), help="Output directory")
    parser.add_argument("--no-sql", action="store_true", help="Disable SQL output")
    parser.add_argument("--minify-json", action="store_true", help="Write topic JSON files minified")
    parser.add_argument(
        "--max-output-mb",
        type=int,
        default=None,
        help="If output exceeds this size, auto-minify JSON and then drop SQL if still above threshold",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    counts = generate_all(
        seed=args.seed,
        knowledge_dir=args.knowledge_dir,
        out_dir=args.out_dir,
        emit_sql=not args.no_sql,
        minify_json=args.minify_json,
        max_output_mb=args.max_output_mb,
    )
    print("SmartIQ dataset generated successfully.")
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
