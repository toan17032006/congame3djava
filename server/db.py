"""SQLite persistence layer. Database file is created automatically."""
import json
import os
import sqlite3
import threading
import time
from typing import Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samurai.db")

_SCHEMA_VERSION = 1
_lock = threading.Lock()
_conn: Optional[sqlite3.Connection] = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _ensure_schema(_conn)
    return _conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS saves (
            slot TEXT PRIMARY KEY,
            schema_version INTEGER NOT NULL,
            payload TEXT NOT NULL,
            level INTEGER NOT NULL DEFAULT 0,
            playtime REAL NOT NULL DEFAULT 0,
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL
        );
        """
    )
    row = conn.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
    if row is None:
        conn.execute(
            "INSERT INTO meta (key, value) VALUES ('schema_version', ?)",
            (str(_SCHEMA_VERSION),),
        )
    conn.commit()


class ValidationError(Exception):
    pass


_MAX_SAVE_BYTES = 2 * 1024 * 1024  # 2 MB
_REQUIRED_KEYS = {"meta", "player", "progress"}


def validate_save_payload(body: Any) -> dict:
    """Server-side shape validation. The client is the source of truth for a
    single-player game, so this is a sanity/abuse guard, not an anti-cheat."""
    if not isinstance(body, dict):
        raise ValidationError("payload must be a JSON object")
    raw = json.dumps(body)
    if len(raw.encode("utf-8")) > _MAX_SAVE_BYTES:
        raise ValidationError("payload too large")
    version = body.get("version")
    if not isinstance(version, int) or version < 1 or version > 999:
        raise ValidationError("version must be a positive integer")
    data = body.get("data")
    if not isinstance(data, dict):
        raise ValidationError("data must be a JSON object")
    missing = _REQUIRED_KEYS - data.keys()
    if missing:
        raise ValidationError(f"data missing keys: {sorted(missing)}")
    meta = data["meta"]
    if not isinstance(meta, dict):
        raise ValidationError("meta must be an object")
    if not isinstance(data.get("player"), dict):
        raise ValidationError("player must be an object")
    if not isinstance(data.get("progress"), dict):
        raise ValidationError("progress must be an object")
    return body


def save_slot(slot: str, body: dict) -> dict:
    with _lock:
        conn = _get_conn()
        now = time.time()
        data = body["data"]
        level = int(data.get("player", {}).get("level", 0) or 0)
        playtime = float(data.get("meta", {}).get("playtime", 0) or 0)
        conn.execute(
            """
            INSERT INTO saves (slot, schema_version, payload, level, playtime, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slot) DO UPDATE SET
                schema_version=excluded.schema_version,
                payload=excluded.payload,
                level=excluded.level,
                playtime=excluded.playtime,
                updated_at=excluded.updated_at
            """,
            (slot, body["version"], json.dumps(data), level, playtime, now, now),
        )
        conn.commit()
    return {"ok": True, "slot": slot}


def load_slot(slot: str) -> Optional[dict]:
    with _lock:
        conn = _get_conn()
        row = conn.execute("SELECT * FROM saves WHERE slot=?", (slot,)).fetchone()
    if row is None:
        return None
    try:
        data = json.loads(row["payload"])
    except (ValueError, TypeError):
        return None
    return {
        "slot": row["slot"],
        "version": row["schema_version"],
        "data": data,
        "updated_at": row["updated_at"],
    }


def list_slots() -> list:
    with _lock:
        conn = _get_conn()
        rows = conn.execute(
            "SELECT slot, schema_version, level, playtime, created_at, updated_at FROM saves ORDER BY updated_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def delete_slot(slot: str) -> bool:
    with _lock:
        conn = _get_conn()
        cur = conn.execute("DELETE FROM saves WHERE slot=?", (slot,))
        conn.commit()
    return cur.rowcount > 0
