from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.repository import InMemoryReleaseRepository
from app.seed import seed_releases

FIXED_TIME = datetime.fromisoformat("2026-09-04T12:00:00+00:00")


@pytest.fixture
def repository() -> InMemoryReleaseRepository:
    return InMemoryReleaseRepository(seed_releases(), now=lambda: FIXED_TIME)


@pytest.fixture
def client(repository: InMemoryReleaseRepository) -> Iterator[TestClient]:
    with TestClient(create_app(repository)) as test_client:
        yield test_client
