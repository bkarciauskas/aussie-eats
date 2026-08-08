import os

# Settings are read at import time via env; set defaults before app imports.
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_DB", "aussieeats_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-at-least-32-characters-long")

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client(monkeypatch):
    async def _noop():
        return None

    monkeypatch.setattr("app.main.connect_db", _noop)
    monkeypatch.setattr("app.main.ensure_indexes", _noop)
    monkeypatch.setattr("app.main.close_db", _noop)

    with TestClient(app) as test_client:
        yield test_client
