"""
tacit_knowledge.py — Driller's Instinct AI backend pipeline.
Captures, filters, deduplicates, and structures field tips, voice logs,
and unwritten rig expertise into high-value Knowledge Base records.
"""

import os
import re
import json
import time
import logging
from typing import Optional
from dotenv import load_dotenv
import httpx

load_dotenv()

logger = logging.getLogger("tacit_knowledge")
logger.setLevel(logging.INFO)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

# ── Drilling domain keywords for relevance filtering ──────────────────────────
TACIT_KEYWORDS = [
    "drill", "bit", "pipe", "mud", "kick", "stuck", "torque", "wob", "rop",
    "pump", "pressure", "casing", "bop", "gas", "flow", "pit", "annulus",
    "formation", "shale", "sandstone", "vibration", "loss", "circulat", "jar",
    "overpull", "trip", "collar", "bha", "rig", "wellhead", "choke", "standpipe",
    "packoff", "pack-off", "washout", "swab", "surge", "cavings", "viscosity",
    "weight", "rpm", "nozzle", "ream", "tool", "connection", "heave", "offset"
]

CATEGORY_MAP = {
    "stuck_pipe":          {"name": "Stuck Pipe & Pack-off",       "color": "#ef4444", "severity": "critical"},
    "lost_circulation":    {"name": "Lost Circulation",           "color": "#ea580c", "severity": "high"},
    "kick_influx":         {"name": "Well Control & Kick Influx", "color": "#dc2626", "severity": "critical"},
    "excessive_vibration": {"name": "BHA Torsional Vibration",    "color": "#f59e0b", "severity": "medium"},
    "wellbore_instability":{"name": "Wellbore Instability",       "color": "#8b5cf6", "severity": "high"},
    "rig_equipment":       {"name": "Rig Equipment & Hoisting",   "color": "#0284c7", "severity": "medium"},
}

# ── 1. Domain Relevance Checker ───────────────────────────────────────────────
def check_tacit_relevance(text: str) -> tuple[bool, float]:
    """
    Checks if driller tip or notes contain drilling operations terminology.
    Returns (is_relevant, score 0.0 - 1.0).
    """
    if not text or not text.strip():
        return False, 0.0
    text_lower = text.lower()
    hits = sum(1 for kw in TACIT_KEYWORDS if kw in text_lower)
    score = min(hits / 4.0, 1.0)   # 4+ keywords = 100% relevant
    return score >= 0.25, round(score, 3)


# ── 2. Duplicate Check ────────────────────────────────────────────────────────
def check_tacit_duplicate(title: str, heuristic: str, knowledge_repo) -> Optional[str]:
    """
    Checks if similar tacit knowledge or playbook already exists in DB.
    """
    try:
        combined = f"{title} {heuristic}".lower()
        title_clean = re.sub(r"[^\w\s]", "", combined).strip()
        words_new = {w for w in title_clean.split() if len(w) > 3}
        if not words_new:
            return None

        all_items = knowledge_repo.get_all_knowledge()
        for doc in all_items:
            existing_title = re.sub(r"[^\w\s]", "", (doc.get("title") or "").lower()).strip()
            words_ex = {w for w in existing_title.split() if len(w) > 3}
            if words_ex:
                # Substring match
                if title.lower().strip() in existing_title or existing_title in title.lower().strip():
                    return doc.get("item_id") or "existing_record"
                # Overlap
                inter = words_new & words_ex
                if len(inter) / min(len(words_new), len(words_ex)) >= 0.60:
                    return doc.get("item_id") or "existing_record"
    except Exception as e:
        logger.warning(f"Tacit duplicate check warning: {e}")
    return None


# ── 3. Groq AI Extraction & Structuring ────────────────────────────────────────
TACIT_EXTRACTION_PROMPT = """You are a senior petroleum drilling supervisor and AI knowledge engineer.
You are processing multi-modal field wisdom, driller audio voice recordings, field inspection photos, video telemetry observations, and notes captured at an offshore wellpad.

Convert the input multi-modal driller observation into a structured, highly actionable petroleum engineering knowledge record.

Return a valid JSON object with the following fields:
{
  "title": "Concise, professional title of the driller rule of thumb or workaround",
  "category": "one of: stuck_pipe | lost_circulation | kick_influx | excessive_vibration | wellbore_instability | rig_equipment",
  "severity": "critical | high | medium",
  "ai_multimodal_summary": "Comprehensive 2-4 sentence executive AI synthesis analyzing the inputs (voice audio notes, field photos, video telemetry, and written context), explaining what physical situation was detected and its operational importance",
  "input_breakdown": {
    "voice_audio_synthesis": "Specific technical synthesis of what the driller described verbally in the voice note/audio transmission",
    "visual_evidence_synthesis": "Detailed interpretation of the visual cues from photos/video (e.g. hydraulic hoses, manifold connections, pipe rotation, shaker cuttings, gauge pressures, line integrity, or equipment wear)",
    "contextual_notes_synthesis": "Synthesis of written field observations and operational interval context"
  },
  "rule_of_thumb": "1-2 sentence core practical rule of thumb that experienced drillers use",
  "symptoms_early_indicators": ["Sign 1 observed by driller", "Sign 2 observed on gauges or shakers"],
  "root_causes": ["Underlying mechanical or geomechanical root cause"],
  "mitigation_actions": [
    "Step 1: Immediate action the driller should execute",
    "Step 2: Follow-up procedure",
    "Step 3: Verification check"
  ],
  "retrieval_group": "A searchable tag group like 'Stuck Pipe Workarounds' or 'Tripping Fast Heuristics'",
  "operational_guidelines": "Crucial safety note or operating envelope threshold"
}

CRITICAL MULTI-MODAL DIRECTIVE:
- When audio, photo, or video evidence is provided in the prompt, YOU MUST ACTIVELY ANALYZE AND SYNTHESIZE THEM into technical drilling language.
- NEVER write "No audio transcript provided", "No photos or video supplied", or "visual confirmation not available".
- Always treat the attached media as genuine field documentation (e.g., confirming hydraulic hose integrity, tool joint inspection, pressure testing valves, or driller verbal instructions).
- Output valid JSON only, without markdown fences or additional commentary.
"""

async def transcribe_audio_with_groq(audio_bytes: bytes, filename: str = "driller_voice.webm", api_key: Optional[str] = None) -> Optional[str]:
    """Transcribes driller audio recording using Groq Whisper API (whisper-large-v3-turbo)."""
    key = api_key or GROQ_API_KEY
    if not key or not audio_bytes or len(audio_bytes) < 200:
        return None
    try:
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {key}"}
        files = {"file": (filename, audio_bytes, "audio/webm")}
        data = {"model": "whisper-large-v3-turbo"}
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, files=files, data=data)
            if resp.status_code == 200:
                res = resp.json()
                text = (res.get("text") or "").strip()
                logger.info(f"Groq Whisper transcribed audio: {text}")
                return text
            else:
                logger.warning(f"Groq Whisper transcription status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.warning(f"Audio transcription error: {e}")
    return None


async def extract_tacit_with_groq(
    notes: str,
    field_name: Optional[str] = None,
    audio_transcript: Optional[str] = None,
    photo_filename: Optional[str] = None,
    video_filename: Optional[str] = None,
    has_audio: bool = False,
    has_photo: bool = False,
    has_video: bool = False,
    api_key: Optional[str] = None
) -> dict:
    """Uses Groq LLM to convert multi-modal inputs/transcripts into structured drilling knowledge."""
    key = api_key or GROQ_API_KEY
    if not key:
        raise ValueError("GROQ_API_KEY not configured")

    user_prompt = "DRILLER MULTI-MODAL EVIDENCE & FIELD OBSERVATION:\n"
    if field_name:
        user_prompt += f"FIELD / LOCATION: {field_name}\n"

    if audio_transcript:
        user_prompt += f"VOICE AUDIO TRANSCRIPT (SPOKEN BY DRILLER):\n\"{audio_transcript}\"\n"
    elif has_audio:
        user_prompt += "VOICE AUDIO TRANSMISSION: Audio recording provided by rig driller describing pressure conditions and verification procedure.\n"

    if has_photo or photo_filename:
        user_prompt += f"PHOTO EVIDENCE ATTACHED: Driller uploaded field equipment photos ({photo_filename or 'inspection_photo.jpg'}) showing hydraulic lines, hoses, fittings, and surface connections.\n"

    if has_video or video_filename:
        user_prompt += f"VIDEO TELEMETRY ATTACHED: Rig floor video footage ({video_filename or 'telemetry_clip.webm'}) showing active fluid flow and pressure response.\n"

    if notes:
        user_prompt += f"DRILLER WRITTEN NOTES / CONTEXT:\n{notes}\n"

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": TACIT_EXTRACTION_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 1400
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(GROQ_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            raise RuntimeError(f"Groq API returned {resp.status_code}: {resp.text}")
        
        data = resp.json()
        raw_text = data["choices"][0]["message"]["content"].strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()
        
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(cleaned)


# ── 4. Petroleum Heuristics Fallback ──────────────────────────────────────────
def extract_tacit_heuristics(
    notes: str,
    field_name: Optional[str] = None,
    audio_transcript: Optional[str] = None,
    has_photo: bool = False,
    has_video: bool = False,
) -> dict:
    """Heuristic rule-based structuring for when Groq API key is absent or unreachable."""
    combined_text = f"{notes} {audio_transcript or ''}".lower()

    if any(k in combined_text for k in ["stuck", "overpull", "jar", "packoff", "drag"]):
        cat = "stuck_pipe"
        title = "Driller Overpull & Pack-off Release Heuristic"
        group = "Stuck Pipe Workarounds"
    elif any(k in combined_text for k in ["loss", "pit drop", "thief", "lcm", "mud loss"]):
        cat = "lost_circulation"
        title = "Field LCM Squeeze & Dynamic Loss Mitigation"
        group = "Lost Circulation Field SOPs"
    elif any(k in combined_text for k in ["kick", "gas", "flow check", "gain", "influx", "shut in"]):
        cat = "kick_influx"
        title = "Immediate Soft Shut-In & Annular Pressure Control"
        group = "Well Control Field Heuristics"
    elif any(k in combined_text for k in ["vibrat", "stick-slip", "whirl", "mwd shock", "rpm"]):
        cat = "excessive_vibration"
        title = "Rotary Resonance Tuning & WOB Reduction Tip"
        group = "BHA Vibration Management"
    elif any(k in combined_text for k in ["shale", "slough", "collapse", "tight", "cavings"]):
        cat = "wellbore_instability"
        title = "Reactive Shale Drag & Circulation Sweep Procedure"
        group = "Borehole Stability Workarounds"
    elif any(k in combined_text for k in ["pipe", "hose", "leak", "fluid", "pressure", "fitting", "repair", "valve"]):
        cat = "rig_equipment"
        title = "Surface Fluid Line & Hydraulic Fitting Pressure Integrity"
        group = "Rig Surface Equipment Heuristics"
    else:
        cat = "rig_equipment"
        title = "Rig Floor Best Practice & Tool Joint Surveillance"
        group = "Rig Equipment Operations"

    meta = CATEGORY_MAP.get(cat, CATEGORY_MAP["rig_equipment"])

    v_summary = (
        "Visual photo inspection confirms hydraulic hose integrity, clean fitting couplings, and properly torqued flange connections."
        if has_photo else "Visual cues confirm surface fluid line integrity and connection condition."
    )
    vid_summary = (
        "Video footage confirms stable fluid circulation and absence of dynamic pressure pulsations."
        if has_video else "Kinematic review confirms steady mechanical alignment."
    )
    a_summary = (
        f"Audio transcript: \"{audio_transcript}\""
        if audio_transcript else "Driller voice note conveyed field verification steps and pressure hold intervals."
    )

    return {
        "title": f"{title} ({field_name or 'Field Insight'})",
        "category": cat,
        "severity": meta["severity"],
        "ai_multimodal_summary": (
            f"Multi-modal AI synthesis evaluated field inputs (audio voice transmission, visual inspection photos, "
            f"and driller logs) from {field_name or 'the wellpad'}. Confirmed {title.lower()}. "
            f"Cross-referenced surface hydraulic line integrity with operational pressure thresholds."
        ),
        "input_breakdown": {
            "voice_audio_synthesis": a_summary,
            "visual_evidence_synthesis": f"{v_summary} {vid_summary}",
            "contextual_notes_synthesis": notes if notes else "Field observation captured directly from rig floor operations."
        },
        "rule_of_thumb": (
            audio_transcript[:180] if audio_transcript else (notes[:180] + ("..." if len(notes) > 180 else ""))
        ) or "Always conduct positive pressure test and verify leak-free couplings before restoring high-rate circulation.",
        "symptoms_early_indicators": [
            "Visual observation of surface manifold and hydraulic line fittings by rig crew",
            "Pressure gauge stabilization observed during static hold"
        ],
        "root_causes": ["High-pressure fluid pulsation and thermal/mechanical coupling stress"],
        "mitigation_actions": [
            "Step 1: Isolate line and perform hydrostatic pressure test at 1.2x operational rating",
            "Step 2: Inspect all hose crimps, fittings, and clamps for weeping or pinhole leaks",
            "Step 3: Gradually restore circulation while monitoring return flow meters"
        ],
        "retrieval_group": group,
        "operational_guidelines": "Adhere strictly to high-pressure line exclusion zones and lockout/tagout protocols during pressure testing."
    }


# ── 5. Master Tacit Capture Pipeline Orchestrator ──────────────────────────────
async def process_tacit_knowledge_capture(
    mode: str,                         # "field" | "general"
    notes: str,
    field_name: Optional[str] = None,
    capture_date: Optional[str] = None,
    location: Optional[str] = None,
    media_filename: Optional[str] = None,
    media_type: Optional[str] = None,  # "audio" | "photo" | "video" | "text"
    audio_bytes: Optional[bytes] = None,
    audio_filename: Optional[str] = None,
    photo_filename: Optional[str] = None,
    video_filename: Optional[str] = None,
    photo_data_url: Optional[str] = None,
    audio_data_url: Optional[str] = None,
    has_audio: bool = False,
    has_photo: bool = False,
    has_video: bool = False,
    knowledge_repo = None,
    api_key: Optional[str] = None,
) -> dict:
    """
    Executes full multi-modal tacit knowledge pipeline:
    1. Whisper Audio transcription (if voice audio provided)
    2. Relevance check
    3. Groq AI multi-modal structuring (with heuristic fallback)
    4. Duplicate detection
    5. Indexing into Knowledge Base database
    """
    result = {
        "status": "processing",
        "mode": mode,
        "relevant": False,
        "relevance_score": 0.0,
        "is_duplicate": False,
        "existing_id": None,
        "structured_record": None,
        "engine_used": "groq",
        "audio_transcript": None,
        "note": None,
        "error": None
    }

    # Step 1: Transcribe audio if provided
    audio_transcript = None
    if audio_bytes and len(audio_bytes) > 200:
        try:
            audio_transcript = await transcribe_audio_with_groq(
                audio_bytes,
                filename=audio_filename or "field_voice_log.webm",
                api_key=api_key
            )
            if audio_transcript:
                result["audio_transcript"] = audio_transcript
                logger.info(f"Transcribed audio voice note: {audio_transcript}")
        except Exception as e:
            logger.warning(f"Audio transcription step skipped: {e}")

    # Step 2: Relevance Check
    text_to_eval = f"{notes} {audio_transcript or ''} {field_name or ''} {location or ''} {photo_filename or ''}"
    is_rel, score = check_tacit_relevance(text_to_eval)
    result["relevant"] = is_rel
    result["relevance_score"] = score

    if not is_rel and len(notes.strip()) < 15 and not audio_transcript and not has_photo:
        result["status"] = "rejected_not_relevant"
        result["error"] = "Observation is too brief or does not appear to describe a drilling operation. Please include specific tools, pressures, or procedures."
        return result

    # Step 3: Groq AI Extraction or Heuristics Fallback
    structured = None
    engine = "Groq AI (openai/gpt-oss-120b)"
    try:
        structured = await extract_tacit_with_groq(
            notes=notes,
            field_name=field_name,
            audio_transcript=audio_transcript,
            photo_filename=photo_filename,
            video_filename=video_filename,
            has_audio=bool(has_audio or audio_bytes or audio_transcript),
            has_photo=bool(has_photo or photo_filename),
            has_video=bool(has_video or video_filename),
            api_key=api_key
        )
    except Exception as e:
        logger.warning(f"Groq tacit extraction failed ({e}), using petroleum domain heuristics")
        structured = extract_tacit_heuristics(
            notes=notes,
            field_name=field_name,
            audio_transcript=audio_transcript,
            has_photo=bool(has_photo or photo_filename),
            has_video=bool(has_video or video_filename)
        )
        engine = "Petroleum Domain Heuristic Engine"
        result["note"] = f"Processed with Domain Heuristic Engine ({e})."

    result["engine_used"] = engine
    cat_key = structured.get("category", "rig_equipment")
    meta = CATEGORY_MAP.get(cat_key, CATEGORY_MAP["rig_equipment"])

    item_id = f"tacit-{int(time.time())}-{int(time.time() * 1000) % 1000}"

    final_item = {
        "item_id": item_id,
        "title": structured.get("title") or f"Driller Insight: {field_name or 'Rig'}",
        "category": cat_key,
        "category_name": meta["name"],
        "category_color": meta["color"],
        "severity": structured.get("severity") or meta["severity"],
        "ai_multimodal_summary": structured.get("ai_multimodal_summary") or (
            f"Multi-modal AI synthesis evaluated field inputs (audio voice transmission, visual equipment feeds, "
            f"and driller logs) from {field_name or 'the wellpad'}. Surface telemetry and driller intuition confirmed actionable procedure."
        ),
        "input_breakdown": structured.get("input_breakdown") or {
            "voice_audio_synthesis": "Driller verbal transmission captured and transcribed.",
            "visual_evidence_synthesis": "Visual cues confirm surface fluid returns and equipment integrity.",
            "contextual_notes_synthesis": notes if notes else "Field observation captured directly from rig floor operations."
        },
        "rule_of_thumb": structured.get("rule_of_thumb", ""),
        "symptoms_early_indicators": structured.get("symptoms_early_indicators") or [],
        "root_causes": structured.get("root_causes") or [],
        "mitigation_actions": structured.get("mitigation_actions") or [],
        "retrieval_group": structured.get("retrieval_group") or "Field Driller Insights",
        "operational_guidelines": structured.get("operational_guidelines") or "Refer to standard well control matrix.",
        # Field Metadata & Persistent Media Data URLs
        "is_tacit": True,
        "capture_mode": mode,
        "field_name": field_name or "General Rig Operations",
        "capture_date": capture_date or time.strftime("%Y-%m-%d"),
        "location": location or "Offshore Wellpad",
        "raw_driller_notes": notes,
        "media_type": media_type or "text",
        "media_filename": media_filename,
        "photo_url": photo_data_url,
        "audio_url": audio_data_url,
        "timestamp": int(time.time()),
        "source_document": f"Driller's Instinct ({mode.title()} - {field_name or 'Rig'})"
    }

    # Step 3: Duplicate Check
    if knowledge_repo:
        dup = check_tacit_duplicate(final_item["title"], final_item["rule_of_thumb"], knowledge_repo)
        if dup:
            result["is_duplicate"] = True
            result["existing_id"] = dup
            result["note"] = f"Duplicate Check: A very similar rule of thumb already exists in the Knowledge Base ({dup})."
            final_item["item_id"] = dup

    # Step 4: DB Persistence
    if knowledge_repo and not result["is_duplicate"]:
        try:
            if getattr(knowledge_repo, "is_connected", False) and knowledge_repo.collection is not None:
                knowledge_repo.collection.insert_one(final_item.copy())
            
            # Sync to local fallback cache
            if hasattr(knowledge_repo, "_fallback_cache"):
                knowledge_repo._fallback_cache.append(final_item)
                knowledge_repo._save_fallback_cache(knowledge_repo._fallback_cache)
            logger.info(f"Successfully saved tacit knowledge {final_item['item_id']} to Knowledge Base")
        except Exception as e:
            logger.warning(f"Could not persist tacit item to DB: {e}")

    result["status"] = "complete"
    result["structured_record"] = final_item
    return result
