"""Export local evidence for Codex/human visual proofreading; no network calls."""

from copy import deepcopy
import json
import math
import os
from pathlib import Path
import shutil
import tempfile

import fitz
from PIL import Image

from .output import Output
from ..review import bbox, checksum, quality
from ...mission.recovery import file_digest, file_signature


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")
    os.replace(str(temporary), str(path))


class OutputReview(Output):
    def __init__(self, argd):
        self.dir = argd["outputDir"]
        # Separate bundle every time: never replace an earlier reviewed edition.
        self.root = Path(tempfile.mkdtemp(prefix=argd["outputFileName"] + ".review-", dir=self.dir))
        self.outputPath = str(self.root)
        self.password = argd.get("password", "")
        self.manifest = {"schema_version": 1, "status": "exporting", "pages": [],
                         "reviewer": "not_run", "network_requests": 0,
                         "expected_pages": argd.get("expectedItems")}
        shutil.copyfile(Path(__file__).resolve().parent.parent / "review" / "prompt.md", self.root / "PROMPT.md")
        write_json(self.root / "manifest.json", self.manifest)

    def print(self, res):
        if "rawResult" not in res:
            raise ValueError("Raw evidence is missing; enable the review output and recognize again")
        source = Path(res["path"])
        before = file_signature(source)
        source_digest = file_digest(source)
        if source_digest != res.get("sourceFingerprint"):
            raise ValueError("Source changed since recognition; review export stopped")
        item_id = "p%06d" % (len(self.manifest["pages"]) + 1)
        folder = self.root / item_id
        folder.mkdir()
        (folder / "crops").mkdir()
        alignment = "page_coordinates"
        if "page" in res:
            with fitz.open(str(source)) as doc:
                if doc.is_encrypted and not doc.authenticate(self.password):
                    raise ValueError("Document password is incorrect")
                page = doc[res["page"] - 1]
                scale = min(2.0, 4096.0 / max(page.rect.width, page.rect.height))
                pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), colorspace=fitz.csRGB, alpha=False)
                picture = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                coordinate_size = [page.rect.width, page.rect.height]
        else:
            with Image.open(source) as original:
                picture = original.convert("RGB")
                coordinate_size = list(original.size)
                if original.getexif().get(274, 1) != 1:
                    alignment = "exif_orientation_requires_review"
        try:
            if before != file_signature(source):
                raise ValueError("Source changed during rendering")
            picture.save(folder / "page.png")
            raw = deepcopy(res["rawResult"])
            report = quality(raw, res.get("data"), res.get("error"))
            if alignment != "page_coordinates":
                report["flags"].append(alignment)
                report["status"] = "needs_review"
            crops = []
            blocks = raw.get("data") if isinstance(raw.get("data"), list) else []
            for finding in report["findings"][:200]:
                position = int(finding["block_id"][1:]) - 1
                rect = bbox(blocks[position])
                if rect is None or alignment != "page_coordinates":
                    continue
                sx, sy = picture.width / coordinate_size[0], picture.height / coordinate_size[1]
                area = [max(0, math.floor(rect[0] * sx) - 12), max(0, math.floor(rect[1] * sy) - 12),
                        min(picture.width, math.ceil(rect[2] * sx) + 12),
                        min(picture.height, math.ceil(rect[3] * sy) + 12)]
                if area[2] <= area[0] or area[3] <= area[1]:
                    continue
                name = "crops/" + finding["block_id"] + ".png"
                with picture.crop(area) as crop:
                    crop.save(folder / name)
                crops.append({"block_id": finding["block_id"], "file": name, "pixel_bbox": area,
                              "sha256": file_digest(folder / name)})
            evidence = {"schema_version": 1, "source": {"filename": source.name,
                        "sha256": source_digest, "page": res.get("page"),
                        "coordinate_size": coordinate_size},
                        "render": {"file": "page.png", "size": list(picture.size),
                                   "alignment": alignment, "sha256": file_digest(folder / "page.png")},
                        "raw": raw, "processed": {"code": res["code"], "data": deepcopy(res.get("data")),
                                                   "error": res.get("error")},
                        "quality": report, "crops": crops,
                        "uncropped_findings": len(report["findings"]) - len(crops)}
            write_json(folder / "page.json", evidence)
            self.manifest["pages"].append({"id": item_id, "file": item_id + "/page.json",
                                           "digest": checksum(evidence), "status": report["status"]})
            write_json(self.root / "manifest.json", self.manifest)
        finally:
            picture.close()

    def onEnd(self):
        # Finishing an exporter does not mean the input batch or review completed.
        self.manifest["status"] = "export_closed"
        self.manifest["export_complete"] = self.manifest["expected_pages"] == len(self.manifest["pages"])
        write_json(self.root / "manifest.json", self.manifest)
