import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.db.database import Base, engine
from backend.main import app
from backend.services.nasa_client import NasaApiClient, nasa_client

# Crea las tablas antes de los tests y las elimina al terminar


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_health_check():
    """El endpoint ráiz debe responder 200"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["estado"] == "ok"


def test_date_format_invalid():
    """Una fecha mal formada debe devolver 422"""
    response = client.get("/api/asteroids/?date=no-es-fecha")
    assert response.status_code == 422


def test_date_log_injection():
    """Intentos de log injection deben devolver 422"""
    response = client.get("/api/asteroids/?date=2024-01-01%0AINFO:fake")
    assert response.status_code == 422


def test_date_valid_returns_list():
    """Una fecha válida con mock debe devolver lista"""
    with patch("backend.services.asteroid_service.nasa_client") as mock:
        mock.fetch_asteroids = AsyncMock(return_value={
            "near_earth_objects": {"2024-01-15": []}
        })
        response = client.get("/api/asteroids/?date=2024-01-15")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


def test_fetch_asteroids_rejects_ranges_over_7_days():
    """La regla de negocio limita la ventana de búsqueda a 7 días."""
    with pytest.raises(ValueError):
        asyncio.run(nasa_client.fetch_asteroids("2024-01-01", "2024-01-09"))


def test_fetch_asteroids_rejects_end_before_start():
    """Un end_date anterior a start_date debe rechazarse."""
    with pytest.raises(ValueError):
        asyncio.run(nasa_client.fetch_asteroids("2024-01-07", "2024-01-01"))


def test_fetch_asteroids_uses_get_with_expected_params():
    """La petición al Feed usa GET con start_date, end_date y api_key."""
    client = NasaApiClient()
    fake_response = SimpleNamespace(
        status_code=200,
        raise_for_status=lambda: None,
        json=lambda: {"near_earth_objects": {}},
    )
    client.client.get = AsyncMock(return_value=fake_response)

    result = asyncio.run(client.fetch_asteroids("2024-01-01", "2024-01-07"))

    assert result == {"near_earth_objects": {}}
    call = client.client.get.call_args
    assert call.args[0].endswith("/feed")
    params = call.kwargs["params"]
    assert params["start_date"] == "2024-01-01"
    assert params["end_date"] == "2024-01-07"
    assert params["api_key"]
