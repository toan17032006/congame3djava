"""FastAPI application: static client hosting + save-game API."""
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import __version__, db

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT, "web", "dist")
WEB_DIR = os.path.join(ROOT, "web")

app = FastAPI(title="Samurai 3D Action RPG", version=__version__)


@app.get("/api/health")
def health():
    db_ok = os.path.exists(db.DB_PATH)
    return {"status": "ok", "version": __version__, "database": db.DB_PATH if db_ok else "not created yet"}


def _client_dir():
    if os.path.isdir(DIST_DIR) and os.path.isfile(os.path.join(DIST_DIR, "index.html")):
        return "web/dist (production build)"
    if os.path.isfile(os.path.join(WEB_DIR, "index.html")):
        return "web/ (source, run: npm run build)"
    return None


@app.get("/api/build-info")
def build_info():
    return {"client": _client_dir() or "missing - run: npm install && npm run build"}


@app.get("/api/saves")
def saves_list():
    return {"saves": db.list_slots()}


@app.post("/api/saves/{slot}")
async def saves_write(slot: str, request: Request):
    if not (1 <= len(slot) <= 32) or not all(c.isalnum() or c in "-_" for c in slot):
        raise HTTPException(status_code=400, detail="invalid slot name")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="body must be JSON")
    try:
        body = db.validate_save_payload(body)
    except db.ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return db.save_slot(slot, body)


@app.get("/api/saves/{slot}")
def saves_read(slot: str):
    result = db.load_slot(slot)
    if result is None:
        raise HTTPException(status_code=404, detail="save not found")
    return result


@app.delete("/api/saves/{slot}")
def saves_delete(slot: str):
    if not db.delete_slot(slot):
        raise HTTPException(status_code=404, detail="save not found")
    return {"ok": True}


@app.exception_handler(500)
async def server_error(request, exc):
    return JSONResponse(status_code=500, content={"detail": "internal server error"})


def _mount_client():
    if os.path.isdir(DIST_DIR) and os.path.isfile(os.path.join(DIST_DIR, "index.html")):
        app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="client")
    elif os.path.isfile(os.path.join(WEB_DIR, "index.html")):
        app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="client")


_mount_client()
