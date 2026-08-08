from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import close_db, connect_db, ensure_indexes
from app.routers import admin, auth, favourites, orders, restaurants, reviews, search


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_db()
    await ensure_indexes()
    try:
        yield
    finally:
        await close_db()


app = FastAPI(title="AussieEats API", version="0.1.0", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(restaurants.router)
app.include_router(orders.router)
app.include_router(favourites.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(search.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
