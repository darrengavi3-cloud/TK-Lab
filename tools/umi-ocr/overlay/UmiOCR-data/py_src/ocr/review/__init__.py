"""Local evidence and explicit revision tools for visual OCR proofreading."""

from copy import deepcopy
import hashlib
import json
import math


def checksum(value):
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def valid_score(value):
    return (not isinstance(value, bool) and isinstance(value, (int, float))
            and math.isfinite(value) and 0 <= value <= 1)


def mean_score(blocks):
    scores = [block.get("score") for block in blocks]
    if not scores or not all(valid_score(score) for score in scores):
        return None
    return sum(scores) / len(scores)


def bbox(block):
    box = block.get("box")
    if not isinstance(box, (list, tuple)) or len(box) != 4:
        return None
    if any(not isinstance(p, (list, tuple)) or len(p) != 2 for p in box):
        return None
    values = [v for point in box for v in point]
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
        return None
    xs, ys = zip(*box)
    if max(xs) <= min(xs) or max(ys) <= min(ys):
        return None
    return [min(xs), min(ys), max(xs), max(ys)]


def quality(raw, processed, error=None, threshold=0.85):
    """Scores are engine-specific triage signals, not correctness guarantees."""
    blocks = raw.get("data") if raw.get("code") == 100 else []
    blocks = blocks if isinstance(blocks, list) else []
    findings = []
    for i, block in enumerate(blocks):
        reasons = []
        score = block.get("score")
        valid = valid_score(score)
        if block.get("from") != "text":
            if not valid:
                reasons.append("unknown_confidence")
            elif score < threshold:
                reasons.append("low_confidence")
        text = block.get("text", "")
        if not isinstance(text, str) or not text:
            reasons.append("empty_text")
        elif "\ufffd" in text:
            reasons.append("replacement_character")
        if bbox(block) is None:
            reasons.append("invalid_geometry")
        if reasons:
            findings.append({"block_id": "b%06d" % (i + 1), "reasons": reasons})
    flags = []
    if error or raw.get("code") not in (100, 101):
        flags.append("incomplete_recognition")
    if not blocks:
        flags.append("no_text_detected")
    processed_blocks = processed if isinstance(processed, list) else []
    if len(processed_blocks) != len(blocks):
        flags.append("postprocessing_changed_block_count")
    return {"threshold": threshold, "raw_block_count": len(blocks),
            "processed_block_count": len(processed_blocks), "findings": findings,
            "flags": flags, "status": "needs_review" if flags or findings else "unreviewed"}


def apply_proposals(page, proposal, accepted_ids):
    """Create a separate edition; never mutate evidence or auto-accept AI text."""
    if proposal.get("page_digest") != checksum(page):
        raise ValueError("Proposal refers to a different or modified evidence page")
    suggestions = proposal.get("suggestions")
    if not isinstance(suggestions, list):
        raise ValueError("suggestions must be a list")
    indexed = {}
    for item in suggestions:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not item["id"]:
            raise ValueError("Every suggestion needs an ID")
        if item["id"] in indexed:
            raise ValueError("Duplicate suggestion ID")
        indexed[item["id"]] = item
    if not accepted_ids or len(set(accepted_ids)) != len(accepted_ids):
        raise ValueError("Explicit, unique accepted IDs are required")
    if any(i not in indexed for i in accepted_ids):
        raise ValueError("Unknown accepted suggestion ID")
    blocks = deepcopy(page["raw"]["data"])
    if not isinstance(blocks, list):
        raise ValueError("This page has no editable text blocks")
    edits, seen = [], set()
    for suggestion_id in accepted_ids:
        item = indexed[suggestion_id]
        block_id = item.get("block_id", "")
        if (not isinstance(block_id, str) or len(block_id) != 7
                or not block_id.startswith("b") or not block_id[1:].isdigit()):
            raise ValueError("Invalid block ID")
        position = int(block_id[1:]) - 1
        if position < 0 or position >= len(blocks) or block_id in seen:
            raise ValueError("Unknown or repeated target block")
        seen.add(block_id)
        if item.get("original") != blocks[position].get("text"):
            raise ValueError("Original text does not match evidence")
        if (not isinstance(item.get("replacement"), str) or not item["replacement"].strip()
                or not isinstance(item.get("reason"), str) or not item["reason"].strip()):
            raise ValueError("Nonempty replacement and evidence reason are required")
        blocks[position]["text"] = item["replacement"]
        edits.append(deepcopy(item))
    return {"schema_version": 1, "evidence_digest": checksum(page),
            "status": "partially_reviewed", "accepted_suggestions": edits,
            "data": blocks, "unresolved": deepcopy(proposal.get("unresolved", [])),
            "note": "Unedited blocks remain unreviewed; reading order follows raw evidence."}
