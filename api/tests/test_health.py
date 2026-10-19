from fastapi.testclient import TestClient

from app.main import app


def test_healthz_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_cors_allows_configured_origin() -> None:
    client = TestClient(app)
    response = client.get("/healthz", headers={"Origin": "http://localhost:3000"})
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_rejects_unknown_origin() -> None:
    client = TestClient(app)
    response = client.get("/healthz", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers
