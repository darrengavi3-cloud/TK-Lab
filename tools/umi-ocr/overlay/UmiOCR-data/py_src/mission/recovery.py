"""Opt-in, local recovery journal. No Qt, models, or credentials are stored here."""

import hashlib
import json
import os
from pathlib import Path
import sqlite3
import time


def canonical_json(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False,
                      separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def file_signature(path):
    stat = os.stat(path)
    return (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns)


def file_digest(path):
    before = file_signature(path)
    result = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    if before != file_signature(path):
        raise RuntimeError("Input changed during fingerprinting: " + str(path))
    return result.hexdigest()


def tree_digest(root):
    """Hash installed code/models, excluding transient Python cache files."""
    root = Path(root)
    if root.is_file():
        return file_digest(root)
    if not root.is_dir():
        raise RuntimeError("Missing recovery identity path: " + str(root))
    entries = []
    for parent, dirs, files in os.walk(str(root), followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in ("__pycache__", ".git"))
        # A model directory symlink can point outside the installed plugin.
        if any(Path(parent, d).is_symlink() for d in dirs):
            raise RuntimeError("Recovery cannot fingerprint a linked model directory")
        for name in sorted(files):
            if name.endswith((".pyc", ".pyo")):
                continue
            path = Path(parent, name)
            entries.append([str(path.relative_to(root)), file_digest(path)])
    return digest(entries)


class JobLock:
    """OS-held lock, released by process exit as well as ordinary close."""

    def __init__(self, path):
        self.stream = open(path, "a+b")
        try:
            if os.name == "nt":
                import msvcrt
                if self.stream.seek(0, os.SEEK_END) == 0:
                    self.stream.write(b"0")
                    self.stream.flush()
                self.stream.seek(0)
                msvcrt.locking(self.stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            self.stream.close()
            raise RuntimeError("This recovery task is already running. "
                               "同一恢复任务正在运行，请等待结束。") from exc

    def close(self):
        if not self.stream.closed:
            if os.name == "nt":
                import msvcrt
                self.stream.seek(0)
                msvcrt.locking(self.stream.fileno(), msvcrt.LK_UNLCK, 1)
            self.stream.close()


class RecoverySession:
    """One journal per ordered input list + recognition recipe.

    Completed results are replayed to NEW exporters in the original order.
    Failed/interrupted items run once per submission. No automatic retry loop.
    Connections are short-lived, so cleanup need not run on the worker thread.
    """

    def __init__(self, directory, kind, items, recipe, document_signature=None):
        self.items = items
        self.kind = kind
        self.document_signature = document_signature
        self.document_digest = None
        self.reused = 0
        self.closed = False
        self.job_id = digest({"schema": 1, "kind": kind, "items": items, "recipe": recipe})
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        self.path = directory / (self.job_id + ".sqlite3")
        self.lock = JobLock(str(self.path) + ".lock")
        try:
            if self.kind == "document":
                source = items[0]["path"]
                if file_signature(source) != self.document_signature:
                    raise RuntimeError("Document changed; stop and import it again. 文档已改变，请重新导入。")
                self.document_digest = file_digest(source)
            with self.connect() as db:
                version = db.execute("PRAGMA user_version").fetchone()[0]
                if version not in (0, 1):
                    raise RuntimeError("Unsupported recovery schema: " + str(version))
                db.execute("CREATE TABLE IF NOT EXISTS job (id INTEGER PRIMARY KEY, "
                           "state TEXT NOT NULL, updated REAL NOT NULL)")
                db.execute("CREATE TABLE IF NOT EXISTS items (position INTEGER PRIMARY KEY, "
                           "source TEXT NOT NULL, fingerprint TEXT, state TEXT NOT NULL, "
                           "attempts INTEGER NOT NULL DEFAULT 0, result TEXT, checksum TEXT)")
                db.execute("PRAGMA user_version=1")
                db.execute("INSERT OR REPLACE INTO job VALUES (1, 'running', ?)", (time.time(),))
                db.executemany("INSERT OR IGNORE INTO items(position,source,state) "
                               "VALUES (?,?,'pending')",
                               [(i, canonical_json(item)) for i, item in enumerate(items)])
                db.execute("UPDATE items SET state='pending' WHERE state='running'")
        except Exception:
            self.lock.close()
            raise

    def connect(self):
        # sqlite3.Connection's context manager commits but does NOT close.
        # Use our own context manager below to also release file handles.
        from contextlib import contextmanager

        @contextmanager
        def connection():
            db = sqlite3.connect(str(self.path), timeout=5)
            try:
                db.execute("PRAGMA synchronous=FULL")
                with db:
                    yield db
            finally:
                db.close()
        return connection()

    def execute(self, position, run):
        if self.closed:
            raise RuntimeError("Recovery session is closed")
        item = self.items[position]
        path = item["path"]
        before = file_signature(path)
        if self.kind == "document":
            if before != self.document_signature:
                raise RuntimeError("Document changed; stop and import it again. 文档已改变，请重新导入。")
            if self.document_digest is None:
                self.document_digest = file_digest(path)
            fingerprint = self.document_digest
        else:
            fingerprint = file_digest(path)
        with self.connect() as db:
            row = db.execute("SELECT fingerprint,state,attempts,result,checksum "
                             "FROM items WHERE position=?", (position,)).fetchone()
            if row[0] == fingerprint and row[1] == "done" and row[3]:
                try:
                    result = json.loads(row[3])
                    valid = (digest(result) == row[4] and result.get("code") in (100, 101)
                             and not result.get("error"))
                except (ValueError, TypeError, AttributeError):
                    valid = False
                if valid:
                    if before != file_signature(path):
                        raise RuntimeError("Input changed while restoring a result")
                    self.reused += 1
                    result["recovery"] = {"reused": True, "attempts": row[2]}
                    return result
            attempts = row[2] + 1
            db.execute("UPDATE items SET fingerprint=?,state='running',attempts=?,"
                       "result=NULL,checksum=NULL WHERE position=?",
                       (fingerprint, attempts, position))
        started = time.time()
        try:
            result = run()
        except Exception as exc:
            # Keep the failure retryable on the next submission.
            result = {"code": 902, "data": "Task failed: " + str(exc)}
        if before != file_signature(path):
            raise RuntimeError("Input changed during recognition; result was not saved")
        result = dict(result)
        result["time"] = time.time() - started
        result["timestamp"] = time.time()
        result.pop("recovery", None)
        state = "done" if result.get("code") in (100, 101) and not result.get("error") else "failed"
        payload = canonical_json(result)
        with self.connect() as db:
            db.execute("UPDATE items SET state=?,result=?,checksum=? WHERE position=?",
                       (state, payload, digest(result), position))
        result["recovery"] = {"reused": False, "attempts": attempts}
        return result

    def close(self, state, release=True):
        if not self.closed:
            try:
                with self.connect() as db:
                    if state == "completed":
                        incomplete = db.execute("SELECT COUNT(*) FROM items WHERE state!='done'").fetchone()[0]
                        if incomplete:
                            state = "incomplete"
                    db.execute("UPDATE job SET state=?,updated=? WHERE id=1", (state, time.time()))
            finally:
                self.closed = True
                if release:
                    self.lock.close()
        elif release:
            self.lock.close()


def attach_recovery(msnInfo, kind, items, recipe_factory, document_signature=None):
    """Attach only from batch-page entry points, never screenshots or HTTP."""
    if not msnInfo.get("recoveryDirectory"):
        return
    msnInfo["recoverySpec"] = (kind, items, recipe_factory, document_signature)


def run_recoverable(msnInfo, run):
    prepare_recovery(msnInfo)
    if "recoverySession" not in msnInfo:
        return run()
    def recognize():
        result = run()
        check_engine(msnInfo)
        return result
    check_engine(msnInfo)
    return msnInfo["recoverySession"].execute(msnInfo.get("recoveryPosition", 0), recognize)


def check_engine(msnInfo):
    check = msnInfo.get("recoveryEngineCheck")
    if check and not check():
        raise RuntimeError("OCR engine changed. 引擎已改变，请重新开始任务。")


def prepare_recovery(msnInfo):
    spec = msnInfo.get("recoverySpec")
    if not spec:
        return
    if "recoverySession" not in msnInfo:
        kind, items, recipe_factory, signature = spec
        check_engine(msnInfo)
        recipe = recipe_factory()
        check_engine(msnInfo)
        msnInfo["recoverySession"] = RecoverySession(
            msnInfo["recoveryDirectory"], kind, items,
            recipe, signature)


def finish_recovery(msnInfo, message, release=True):
    session = msnInfo.get("recoverySession")
    if session:
        if message.startswith("[Success]"):
            state = "completed"
        elif message.startswith("[Error]"):
            state = "failed"
        elif msnInfo.get("failedItems"):
            state = "incomplete"
        else:
            state = "stopped"
        session.close(state, release=release)
