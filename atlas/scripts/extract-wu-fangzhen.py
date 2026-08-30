#!/usr/bin/env python3
"""Extract non-struck Sun Wu regional appointments from the research DOCX.

The generated browser data is deterministic and self-contained.  Struck
appointments and struck administrative names are written only to the audit
manifest; they never enter the application preset array.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

from docx import Document


SOURCE = Path("/Users/bobiaisi01/Desktop/孙吴州郡长官考.docx")
PROJECT = Path(__file__).resolve().parents[1]
JS_OUT = PROJECT / "data" / "wu-fangzhen-records.js"
AUDIT_OUT = PROJECT / "data" / "wu-import-audit.json"

REIGN_BASE = {
    "中平": 183, "初平": 189, "兴平": 193, "建安": 195, "延康": 219,
    "黄武": 221, "黄龙": 228, "嘉禾": 231, "赤乌": 237, "太元": 250,
    "神凤": 251, "建兴": 251, "五凤": 253, "太平": 255, "永安": 257,
    "元兴": 263, "甘露": 264, "宝鼎": 265, "建衡": 268, "凤皇": 271,
    "凤凰": 271, "天玺": 275, "天纪": 276,
}
CN_DIGIT = {"元": 1, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
            "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}


def compact(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def struck_ratio(paragraph) -> float:
    total = struck = 0
    for run in paragraph.runs:
        length = len(compact(run.text))
        total += length
        if run.font.strike:
            struck += length
    return struck / total if total else 0.0


def chinese_number(token: str) -> int | None:
    if token in CN_DIGIT:
        return CN_DIGIT[token]
    if token.startswith("十"):
        return 10 + CN_DIGIT.get(token[1:], 0)
    if "十" in token:
        left, right = token.split("十", 1)
        return CN_DIGIT.get(left, 1) * 10 + CN_DIGIT.get(right, 0)
    return None


def extract_years(text: str) -> tuple[int | None, int | None]:
    values = [int(v) for v in re.findall(r"(?<!卷)(?<!第)(?<!户)(?<!年)(?:18\d|19\d|2[0-9]\d)(?=年|[—~～－-])", text)]
    values += [int(v) for v in re.findall(r"(?<=[（(])(?:18\d|19\d|2[0-9]\d)(?=[）)])", text)]
    values += [int(v) for v in re.findall(r"(?<!卷)(?<!第)(?<!户)(?<!年)(?<!条)(?:18\d|19\d|2[0-9]\d)(?![\d卷])", text)]
    for era, token in re.findall(r"(" + "|".join(REIGN_BASE) + r")([元一二三四五六七八九十]+)年", text):
        number = chinese_number(token)
        if number:
            values.append(REIGN_BASE[era] + number)
    values = sorted(set(v for v in values if 180 <= v <= 320))
    if not values:
        return None, None
    return values[0], values[-1]


def confidence_for(text: str) -> str:
    if re.search(r"误|存疑|孤证|不详|未详|疑|未就任|不得入|不足信|不可考|不知", text):
        return "待考"
    if re.search(r"约|或|当是|推测", text):
        return "中"
    return "较高"


def status_for(text: str) -> str:
    if re.search(r"未就任|不得入", text):
        return "未上任"
    if "遥领" in text:
        return "遥领"
    if re.search(r"存疑|孤证|不详|未详|疑", text):
        return "存疑"
    if "兼领" in text:
        return "兼领"
    if "领" in text and ("州牧" in text or "太守" in text):
        return "领"
    return "实授"


def record_type_for(title: str) -> str:
    if "刺史" in title or "州牧" in title:
        return "cishi"
    if "都督" in title:
        return "dudu"
    if "都尉" in title:
        return "duwei"
    if "太守" in title or title.endswith("相"):
        return "taishou"
    return "other"


def relation_for(title: str) -> str:
    if "州牧" in title:
        return "领州职任"
    if "刺史" in title:
        return "州级职任"
    if "都督" in title:
        return "加督职任"
    if "都尉" in title:
        return "郡级军政职任"
    if "太守" in title or title.endswith("相"):
        return "郡守职任"
    return "职任记录"


def tenure_lead(person: str, text: str) -> str:
    body = text[len(person):].lstrip(" ：:") if text.startswith(person) else text
    cut = len(body)
    for marker in ("《", "见吴简", "见出土", "见绍兴"):
        pos = body.find(marker)
        if pos >= 0:
            cut = min(cut, pos)
    lead = compact(body[:cut]).strip("。；; ")
    return lead[:150] or "任期未详"


def clean_person(value: str) -> str:
    value = re.sub(r"^[一二三四五六七八九十]+、", "", value)
    return value.lstrip("*＊").strip(" ：:")


def first_person(text: str) -> str:
    if text.startswith("吴故庐陵太守虞君"):
        return "虞君（名失载）"
    if text.startswith("广陵相 胡熙"):
        return "胡熙"
    match = re.match(r"[*＊]?([^\s：:，（(。《]+)", text)
    return clean_person(match.group(1)) if match else "失名"


def make_record(seq: int, person: str, title: str, jurisdiction: str, text: str,
                section: str, paragraph_index: int, *, start_year=None, end_year=None,
                confidence=None, appointment_status=None) -> dict:
    auto_start, auto_end = extract_years(text)
    start_year = start_year if start_year is not None else auto_start
    end_year = end_year if end_year is not None else auto_end
    record_type = record_type_for(title)
    return {
        "id": f"fz_wu_doc_{seq:03d}",
        "eraGroup": "three",
        "archiveScope": "核心：汉末—西晋",
        "polity": "吴",
        "recordType": record_type,
        "commander": person,
        "title": title,
        "commission": title,
        "relation": relation_for(title),
        "appointmentStatus": appointment_status or status_for(text),
        "jurisdiction": jurisdiction,
        "seat": "",
        "startYear": start_year,
        "endYear": end_year,
        "tenureText": tenure_lead(person, text),
        "sourceTenureText": tenure_lead(person, text),
        "note": "据研究文档录入；存疑、未详与未上任等措辞均保留，不据此推定常设官署。",
        "sourceLevel": "文档考据",
        "confidence": confidence or confidence_for(text),
        "sourceTitle": f"《孙吴州郡长官考》·{section}",
        "sourceUrl": "",
        "sourceLocator": f"段落 {paragraph_index + 1} · {jurisdiction}",
        "sourceExcerpt": text,
        "importBatch": "sunwu-docx-20260801",
    }


def heading_title(text: str) -> tuple[str, str]:
    cleaned = clean_person(text)
    person = re.split(r"[（(]", cleaned, 1)[0].strip()
    inside = ""
    match = re.search(r"[（(]([^）)]+)[）)]", cleaned)
    if match:
        inside = match.group(1)
    candidates = [part.strip() for part in re.split(r"[、，,]", inside) if re.search(r"州牧|刺史", part)]
    title = candidates[-1] if candidates else ("荆州牧" if "州牧" in cleaned else "荆州刺史")
    title = re.sub(r"^领", "", title)
    return person, title


def split_special(index: int, text: str) -> list[str]:
    markers = {133: "滕胤", 165: "顾邵"}
    marker = markers.get(index)
    if marker and marker in text:
        pos = text.index(marker)
        return [compact(text[:pos]), compact(text[pos:])]
    return [text]


def main() -> None:
    document = Document(SOURCE)
    paragraphs = document.paragraphs
    records: list[dict] = []
    exclusions: list[dict] = []
    seq = 1

    def add(person, title, jurisdiction, text, section, index, **kwargs):
        nonlocal seq
        records.append(make_record(seq, person, title, jurisdiction, text, section, index, **kwargs))
        seq += 1

    # 荆州牧/刺史：一个二级标题对应一条职任，正文作为证据合并。
    for index in range(2, 21):
        paragraph = paragraphs[index]
        if paragraph.style.name != "Heading 2":
            continue
        evidence = []
        cursor = index + 1
        while cursor < 40 and paragraphs[cursor].style.name != "Heading 2":
            if compact(paragraphs[cursor].text):
                evidence.append(compact(paragraphs[cursor].text))
            cursor += 1
        person, title = heading_title(compact(paragraph.text))
        text = compact(paragraph.text + " " + " ".join(evidence))
        jurisdiction = "荆州、扬州" if "荆、扬州牧" in compact(paragraph.text) else "荆州"
        if jurisdiction == "荆州、扬州":
            title = "荆、扬州牧"
        add(person, title, jurisdiction, text, "荆州牧考", index)

    # 郡级长官章节。
    blocks = [
        (43, 119, "孙吴荆州郡守考"),
        (125, 241, "孙吴扬州郡守考"),
        (247, 285, "孙吴交州郡守考"),
    ]
    for start, end, section in blocks:
        jurisdiction = ""
        for index in range(start, end):
            paragraph = paragraphs[index]
            text = compact(paragraph.text)
            if not text:
                continue
            if paragraph.style.name == "Heading 2":
                jurisdiction = re.sub(r"（.*?）", "", text).strip()
                continue
            if paragraph.style.name.startswith("Heading"):
                continue
            if struck_ratio(paragraph) >= 0.55:
                exclusions.append({"kind": "appointment", "paragraphIndex": index,
                                   "person": first_person(text), "text": text,
                                   "reason": "原文删除线，按用户要求不录入"})
                continue
            for item in split_special(index, text):
                person = first_person(item)
                title = jurisdiction + "太守"
                if jurisdiction == "合浦北部都尉 宁浦郡":
                    title, jurisdiction_value = "合浦北部都尉", "合浦北部"
                elif jurisdiction == "高凉西部都尉":
                    title, jurisdiction_value = "高凉西部都尉", "高凉西部"
                elif item.startswith("广陵相 胡熙"):
                    title, jurisdiction_value = "广陵相", "广陵郡"
                elif item.startswith("吴故庐陵太守虞君"):
                    title, jurisdiction_value = "庐陵太守", "庐陵郡"
                else:
                    jurisdiction_value = jurisdiction
                add(person, title, jurisdiction_value, item, section, index)

    # 交州刺史/牧：标题提供人物与任期，后续正文提供证据。
    headings = [i for i in range(290, 319) if paragraphs[i].style.name == "Heading 2"]
    for pos, index in enumerate(headings):
        end = headings[pos + 1] if pos + 1 < len(headings) else 319
        heading = compact(paragraphs[index].text)
        person = clean_person(re.split(r"[（(]", heading, 1)[0])
        evidence = " ".join(compact(paragraphs[j].text) for j in range(index + 1, end) if compact(paragraphs[j].text))
        text = compact(heading + " " + evidence)
        title = "交州牧" if "交州牧" in text else "交州刺史"
        add(person, title, "交州", text, "吴历任交州刺史", index)

    # 广州结论采用作者最终归纳；虞授按较可靠的《吴志》职名列广州都督。
    manual = [
        ("吕岱", "广州刺史", "广州", 351, 226, 226, "较高"),
        ("习温", "广州刺史", "广州", 364, None, None, "中"),
        ("熊睦", "广州刺史", "广州", 359, None, None, "中"),
        ("滕修", "广州刺史", "广州", 359, 271, 276, "中"),
        ("吴展", "广州刺史", "广州", 371, None, None, "中"),
        ("徐旗", "广州刺史", "广州", 365, 279, 279, "较高"),
        ("闾丰", "广州刺史", "广州", 361, 280, 280, "较高"),
        ("虞授", "广州都督", "广州", 365, 279, 279, "中"),
    ]
    for person, title, jurisdiction, index, start_year, end_year, confidence in manual:
        text = compact(paragraphs[index].text)
        add(person, title, jurisdiction, text, "吴历任广州刺史／都督", index,
            start_year=start_year, end_year=end_year, confidence=confidence)

    # 行政附录中的局部删除线只进入排除审计。
    for index in (402, 405):
        paragraph = paragraphs[index]
        for run in paragraph.runs:
            if run.font.strike and compact(run.text):
                exclusions.append({"kind": "administrativeName", "paragraphIndex": index,
                                   "name": compact(run.text), "text": compact(paragraph.text)[:240],
                                   "reason": "原文县名删除线，地图建置数据不得采用"})

    # 去除确定重复的同一段落/人物/职任组合。
    unique = []
    seen = set()
    for record in records:
        key = (record["commander"], record["title"], record["jurisdiction"], record["sourceLocator"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(record)
    records = unique

    counts = Counter(record["recordType"] for record in records)
    audit = {
        "schemaVersion": 1,
        "batchId": "sunwu-docx-20260801",
        "source": str(SOURCE),
        "policy": "删除线条目不录入；存疑、孤证、未详条目保留并降低置信度。行政附录与人物职任分层处理。",
        "recordCount": len(records),
        "recordTypeCounts": dict(sorted(counts.items())),
        "excludedCount": len(exclusions),
        "excluded": exclusions,
    }
    JS_OUT.write_text(
        "/* Generated from 孙吴州郡长官考.docx; do not hand-edit. */\n"
        "window.WU_FANGZHEN_RECORDS = " + json.dumps(records, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    AUDIT_OUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"records": len(records), "types": counts, "excluded": len(exclusions),
                      "js": str(JS_OUT), "audit": str(AUDIT_OUT)}, ensure_ascii=False, default=dict))


if __name__ == "__main__":
    main()
