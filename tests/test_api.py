from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from backend.main import app

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
