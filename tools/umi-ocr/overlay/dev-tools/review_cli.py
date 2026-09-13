#!/usr/bin/env python3
"""Inspect local review evidence and save explicitly accepted edits separately.

Uses only Python's standard library; no Qt, OCR engine or network required.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import uuid

SOURCE = Path(__file__).resolve().parents[1] / "UmiOCR-data/py_src/ocr/review/__init__.py"
spec = importlib.util.spec_from_file_location("umi_review", SOURCE)
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def contained(root, relative):
    path = (root / relative).resolve()
    try:
        path.relative_to(root.resolve())
    except ValueError:
        raise ValueError("Evidence path escapes the bundle")
    return path


def file_sha(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_page(root, page_id):
    if not re.fullmatch(r"p[0-9]{6}", page_id):
        raise ValueError("Invalid page ID")
    manifest = read_json(root / "manifest.json")
    if manifest.get("schema_version") != 1:
        raise ValueError("Unsupported manifest schema")
    matches = [p for p in manifest["pages"] if p["id"] == page_id]
    if len(matches) != 1 or matches[0]["file"] != page_id + "/page.json":
        raise ValueError("Page is missing or ambiguous in manifest")
    entry = matches[0]
    page_path = contained(root, entry["file"])
    page = read_json(page_path)
    if page.get("schema_version") != 1 or review.checksum(page) != entry["digest"]:
        raise ValueError("Evidence page was modified or is unsupported")
    for item in [page["render"]] + page["crops"]:
        asset = contained(page_path.parent, item["file"])
        if file_sha(asset) != item["sha256"]:
            raise ValueError("Evidence image was modified: " + item["file"])
    return page, entry


def apply(root, page_id, proposal_path, accepted_ids):
    page, entry = load_page(root, page_id)
    edition = review.apply_proposals(page, read_json(proposal_path), accepted_ids)
    edition["page_id"] = entry["id"]
    editions = contained(root, "editions")
    editions.mkdir(exist_ok=True)
    destination = editions / (page_id + "-" + uuid.uuid4().hex)
    destination.mkdir()
    with (destination / "edition.json").open("x", encoding="utf-8") as stream:
        json.dump(edition, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")
    with (destination / "text.txt").open("x", encoding="utf-8", newline="") as stream:
        for block in edition["data"]:
            stream.write(block["text"] + block.get("end", "\n"))
    return destination


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    inspect = commands.add_parser("inspect", help="Verify images and list page digests/findings")
    inspect.add_argument("bundle", type=Path)
    edit = commands.add_parser("apply", help="Save selected suggestions as a separate edition")
    edit.add_argument("bundle", type=Path)
    edit.add_argument("--page", required=True)
    edit.add_argument("--proposal", required=True, type=Path)
    edit.add_argument("--accept", required=True, action="append", help="Accepted suggestion ID; repeat per ID")
    args = parser.parse_args(argv)
    root = args.bundle.resolve()
    try:
        if args.command == "apply":
            print(apply(root, args.page, args.proposal, args.accept))
        else:
            manifest = read_json(root / "manifest.json")
            summary = {k: manifest.get(k) for k in ("status", "export_complete", "expected_pages")}
            summary["pages"] = []
            for entry in manifest["pages"]:
                page, entry = load_page(root, entry["id"])
                summary["pages"].append(dict(entry, quality=page["quality"]))
            print(json.dumps(summary, ensure_ascii=False, indent=2))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print("Review failed: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
