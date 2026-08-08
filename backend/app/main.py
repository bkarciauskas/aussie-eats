from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import close_db, connect_db, ensure_indexes


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_db()
    await ensure_indexes()
    try:
        yield
    finally:
        await close_db()


app = FastAPI(title="AussieEats API", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
