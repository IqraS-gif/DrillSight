"""
main.py — FastAPI entry point for DrillInsight
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import threading

from pipeline import pipeline, PARAM_META, RISK_TYPE_META, WELL_GEO
from knowledge_db import knowledge_repo


# ── Background training ────────────────────────────────────────────────────────
def _train_in_background():
    """Train the ML pipeline without blocking the server startup."""
    try:
        pipeline.load_and_train(sample_size=200_000)
    except Exception as ex:
        print(f"[PIPELINE ERROR] {ex}")
        import traceback; traceback.print_exc()

@asynccontextmanager
async def lifespan(app: FastAPI):
    t = threading.Thread(target=_train_in_background, daemon=True)
    t.start()
    yield

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="DrillInsight API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ──────────────────────────────────────────────────
class PredictRequest(BaseModel):
    depth:       Optional[float] = 2000.0
    wob:         Optional[float] = 30.0
    rop:         Optional[float] = 25.0
    torque:      Optional[float] = 8.0
    hookload:    Optional[float] = 100.0
    mud_in:      Optional[float] = 1.2
    spp:         Optional[float] = 8000.0
    shock:       Optional[float] = 0.0
    gas:         Optional[float] = 0.05
    rpm:         Optional[float] = 80.0
    scenario_id: Optional[str]  = None   # when set, pinned probabilities are applied
    risk_type:   Optional[str]  = None   # active hazard from physics engine


# Pinned risk probabilities for preset scenarios.
# These are the exact numbers shown in the UI when the scenario chip is active.
# normal col is computed as 1 - sum(others) to keep total = 1.
SCENARIO_RISK_PINS: dict[str, dict] = {
    "stuck_pipe": {
        "stuck_pipe":           0.72,
        "kick_influx":          0.04,
        "lost_circulation":     0.03,
        "excessive_vibration":  0.05,
    },
    "lost_circ": {
        "stuck_pipe":           0.02,
        "kick_influx":          0.03,
        "lost_circulation":     0.88,
        "excessive_vibration":  0.02,
    },
    "kick": {
        "stuck_pipe":           0.03,
        "kick_influx":          0.82,
        "lost_circulation":     0.04,
        "excessive_vibration":  0.04,
    },
    "vibration": {
        "stuck_pipe":           0.06,
        "kick_influx":          0.03,
        "lost_circulation":     0.02,
        "excessive_vibration":  0.54,
    },
}


def _apply_scenario_pins(result: dict, scenario_id: str) -> dict:
    """Overwrite risk_probabilities and derived fields with pinned values."""
    if scenario_id not in SCENARIO_RISK_PINS:
        return result

    pins = SCENARIO_RISK_PINS[scenario_id]
    non_normal = sum(pins.values())
    probs = {**pins, "normal": max(0.0, round(1.0 - non_normal, 4))}

    dominant = max((k for k in probs if k != "normal"), key=lambda k: probs[k])
    overall_pct = round(non_normal * 100, 1)
    risk_level = "high" if overall_pct >= 60 else ("medium" if overall_pct >= 30 else "normal")

    result["risk_probabilities"]   = probs
    result["risk_type"]            = dominant
    result["overall_risk_percent"] = overall_pct
    result["risk_level"]           = risk_level

    # Keep similar wells lookup aligned to the pinned dominant risk
    if pipeline.ready and pipeline.well_risk_cache:
        result["similar_wells"] = pipeline._find_similar_wells(
            result.get("_params", {}), dominant, probs
        )

    return result


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "pipeline_ready": pipeline.ready}


@app.get("/api/meta")
def meta():
    """Return slider metadata and risk type descriptions."""
    return {
        "param_meta": PARAM_META,
        "risk_type_meta": RISK_TYPE_META,
        "pipeline_ready": pipeline.ready,
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    scenario_id = req.scenario_id
    physics_risk = req.risk_type

    if not pipeline.ready:
        # Return a placeholder (or pinned if scenario known) while training
        placeholder = {
            "pipeline_ready": False,
            "risk_level": "normal",
            "risk_type": physics_risk or "normal",
            "risk_probabilities": {
                "normal": 1.0, "stuck_pipe": 0.0,
                "kick_influx": 0.0, "lost_circulation": 0.0,
                "excessive_vibration": 0.0,
            },
            "overall_risk_percent": 0.0,
            "anomaly_score": 0.0,
            "is_anomaly": False,
            "time_to_incident_hours": 999.0,
            "similar_wells": [],
        }
        if scenario_id:
            placeholder = _apply_scenario_pins(placeholder, scenario_id)
        return placeholder

    params = {k: v for k, v in req.model_dump().items() if k not in ("scenario_id", "risk_type")}
    result = pipeline.predict(params, target_risk=physics_risk)
    result["pipeline_ready"] = True
    result["_params"] = params

    # Inject pinned probabilities if this is a named scenario
    if scenario_id:
        result = _apply_scenario_pins(result, scenario_id)
    elif physics_risk and pipeline.ready and pipeline.well_risk_cache:
        result["risk_type"] = physics_risk
        result["similar_wells"] = pipeline._find_similar_wells(
            params, physics_risk, result.get("risk_probabilities", {})
        )

    result.pop("_params", None)
    return result



@app.get("/api/wells")
def list_wells():
    return {"wells": [
        {"well_name": wn, **geo}
        for wn, geo in WELL_GEO.items()
    ]}


@app.get("/api/scenarios")
def scenarios():
    """Pre-built scenarios the user can load as presets."""
    return {
        "scenarios": [
            {
                "id": "normal",
                "label": "Normal Drilling",
                "description": "All parameters within safe ranges. Low risk.",
                "params": {"depth": 2000, "wob": 30, "rop": 25, "torque": 8, "hookload": 100, "mud_in": 1.2, "spp": 8000, "shock": 2, "gas": 0.05, "rpm": 80},
            },
            {
                "id": "stuck_pipe",
                "label": "Stuck Pipe — High Risk",
                "description": "Elevated hookload, low ROP, high torque oscillation.",
                "params": {"depth": 3800, "wob": 15, "rop": 3, "torque": 28, "hookload": 280, "mud_in": 1.15, "spp": 7500, "shock": 5, "gas": 0.1, "rpm": 110},
            },
            {
                "id": "kick",
                "label": "Kick / Influx — High Risk",
                "description": "High gas reading, low mud density, increasing ROP.",
                "params": {"depth": 4200, "wob": 45, "rop": 65, "torque": 12, "hookload": 95, "mud_in": 0.98, "spp": 6200, "shock": 3, "gas": 18.5, "rpm": 120},
            },
            {
                "id": "lost_circ",
                "label": "Lost Circulation — Medium Risk",
                "description": "Sudden SPP drop, reduced hookload.",
                "params": {"depth": 3200, "wob": 25, "rop": 18, "torque": 6, "hookload": 72, "mud_in": 1.3, "spp": 2800, "shock": 4, "gas": 0.2, "rpm": 90},
            },
            {
                "id": "vibration",
                "label": "Excessive Vibration — Medium Risk",
                "description": "High shock peak, bit bounce, unstable WOB.",
                "params": {"depth": 2700, "wob": 60, "rop": 12, "torque": 22, "hookload": 115, "mud_in": 1.25, "spp": 9500, "shock": 120, "gas": 0.08, "rpm": 180},
            },
        ]
    }


# ── MongoDB Knowledge Repository Endpoints ("yeh wala voh wala risk sabka alag") ──

@app.get("/api/knowledge/categories")
def get_knowledge_categories():
    """Returns all risk categories with counts and metadata."""
    return {
        "status": "ok",
        "mongodb_connected": knowledge_repo.is_connected,
        "categories": knowledge_repo.get_categories(),
    }


@app.get("/api/knowledge/risks/{category}")
def get_knowledge_by_category(category: str, limit: int = 50):
    """
    Rapid retrieval for a specific risk category ('sabka alag').
    Categories: stuck_pipe, lost_circulation, kick_influx, excessive_vibration, wellbore_instability, formation_breakdown, casing_cementing.
    """
    items = knowledge_repo.get_by_category(category, limit=limit)
    return {
        "status": "ok",
        "category": category,
        "count": len(items),
        "mongodb_connected": knowledge_repo.is_connected,
        "items": items,
    }


@app.get("/api/knowledge/search")
def search_knowledge(q: str = "", category: Optional[str] = None, limit: int = 25):
    """Full-text and keyword search across all indexed risk literature."""
    results = knowledge_repo.search(query=q, category=category, limit=limit)
    return {
        "status": "ok",
        "query": q,
        "category": category,
        "count": len(results),
        "mongodb_connected": knowledge_repo.is_connected,
        "results": results,
    }


@app.get("/api/knowledge/match")
def match_knowledge_context(depth: float = 3842.0, risk_type: str = "stuck_pipe", limit: int = 5):
    """Instant contextual lookup for active well depth and predicted hazard."""
    matches = knowledge_repo.get_contextual_match(depth=depth, risk_type=risk_type, limit=limit)
    return {
        "status": "ok",
        "depth": depth,
        "risk_type": risk_type,
        "count": len(matches),
        "mongodb_connected": knowledge_repo.is_connected,
        "matches": matches,
    }
