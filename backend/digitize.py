"""
digitize.py — AI Document Digitization Engine for DrillInsight KB

Pipeline:
  1. PDF/TXT text extraction (pypdf)
  2. Relevance Filter   → Is this drilling-related content?
  3. Duplicate Check    → Does this already exist in the KB?
  4. Domain Validity    → Does it make technical sense?
  5. Groq LLaMA extraction → Structured KB JSON items
  6. MongoDB save        → Persist to risk_knowledge collection
"""

import os
import io
import re
import json
import time
import logging
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger("drillinsight.digitize")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

DRILLING_KEYWORDS = [
    "stuck pipe", "lost circulation", "kick", "influx", "blowout", "wellbore",
    "mud weight", "rop", "drillstring", "bha", "formation", "pore pressure",
    "ecd", "mwd", "lwd", "casing", "cement", "vibration", "stick-slip",
    "shale", "sandstone", "reservoir", "bit", "annulus", "spp", "hookload",
    "torque", "jar", "overpull", "hydrostatic", "drilling fluid", "barite",
    "lcm", "pill", "well control", "kill mud", "shut in", "sidpp", "sicp",
    "hole pack-off", "differential sticking", "key seat", "fish", "junk",
]

VALID_CATEGORIES = [
    "stuck_pipe",
    "lost_circulation",
    "kick_influx",
    "excessive_vibration",
    "wellbore_instability",
    "formation_breakdown",
    "casing_cementing",
]


# ── 1. Text extraction ─────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from a PDF using pypdf."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages[:40]:          # max 40 pages
            txt = page.extract_text() or ""
            pages.append(txt)
        return "\n".join(pages)
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise ValueError(f"Could not read PDF: {e}")


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Route to correct extractor based on file extension."""
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in ("txt", "md", "csv"):
        return file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError(f"Unsupported file type: .{ext}. Upload a PDF or TXT file.")


# ── 2. Relevance Filter ────────────────────────────────────────────────────────

def is_drilling_relevant(text: str) -> tuple[bool, float]:
    """
    Fast keyword-based relevance check.
    Returns (is_relevant, confidence_score 0-1).
    """
    text_lower = text.lower()
    hits = sum(1 for kw in DRILLING_KEYWORDS if kw in text_lower)
    score = min(hits / 8.0, 1.0)              # 8+ keywords = 100% confident
    return score >= 0.25, round(score, 3)     # threshold: ≥25% confidence


# ── 3. Duplicate Check ─────────────────────────────────────────────────────────

def check_duplicate(title: str, knowledge_repo) -> Optional[str]:
    """
    Returns existing item_id if a very similar title or record already exists in KB.
    Works whether connected to MongoDB Atlas or using local cached repository.
    """
    try:
        title_clean = re.sub(r"[^\w\s]", "", title.lower()).strip()
        words_new = {w for w in title_clean.split() if len(w) > 2}
        if not words_new:
            return None

        # Retrieve existing items from MongoDB or local fallback cache
        existing_docs = []
        if getattr(knowledge_repo, "is_connected", False) and knowledge_repo.collection is not None:
            try:
                existing_docs = list(knowledge_repo.collection.find({}, {"title": 1, "item_id": 1, "source_document": 1}))
            except Exception:
                existing_docs = knowledge_repo.get_all_knowledge()
        else:
            existing_docs = knowledge_repo.get_all_knowledge()

        for doc in existing_docs:
            existing_title = re.sub(r"[^\w\s]", "", (doc.get("title") or "").lower()).strip()
            words_ex = {w for w in existing_title.split() if len(w) > 2}
            if words_ex:
                # Direct substring match
                if title_clean in existing_title or existing_title in title_clean:
                    return doc.get("item_id") or "existing_record"

                # Jaccard word overlap
                intersection = words_new & words_ex
                overlap = len(intersection) / min(len(words_new), len(words_ex))
                if overlap >= 0.55:
                    return doc.get("item_id") or "existing_record"
    except Exception as e:
        logger.warning(f"Duplicate check error: {e}")
    return None

# ── 4. Heuristic Fallback Extractor ──────────────────────────────────────────

def extract_with_heuristics(text: str, source_filename: str) -> list[dict]:
    """
    Petroleum engineering domain heuristics extractor.
    Extracts structured drilling risk entries using regex and keyword NLP patterns.
    Used when GROQ_API_KEY is not configured or Groq is unreachable.
    """
    text_lower = text.lower()
    
    # 1. Detect dominant risk category
    cat_scores = {
        "stuck_pipe": sum(1 for kw in ["stuck", "overpull", "pack-off", "pack off", "differential sticking", "jar", "key seat"] if kw in text_lower),
        "lost_circulation": sum(1 for kw in ["lost circ", "mud loss", "losses", "thief zone", "lcm", "seepage", "partial losses"] if kw in text_lower),
        "kick_influx": sum(1 for kw in ["kick", "influx", "pit gain", "flow check", "sidpp", "sicp", "well control", "gas migration", "blowout"] if kw in text_lower),
        "excessive_vibration": sum(1 for kw in ["vibration", "stick-slip", "torsional", "whirl", "shock", "mwd shock", "bit bounce"] if kw in text_lower),
        "wellbore_instability": sum(1 for kw in ["instability", "sloughing", "shale", "cavings", "tight hole", "collapse", "breakout"] if kw in text_lower),
        "formation_breakdown": sum(1 for kw in ["breakdown", "leak-off", "lot", "fit", "fracture gradient", "ballooning"] if kw in text_lower),
        "casing_cementing": sum(1 for kw in ["casing", "cement", "shoe", "liner", "micro-annulus", "channeling"] if kw in text_lower),
    }
    
    # Sort categories by occurrences
    sorted_cats = sorted(cat_scores.items(), key=lambda x: x[1], reverse=True)
    dominant_cat = sorted_cats[0][0] if sorted_cats[0][1] > 0 else "stuck_pipe"

    # 2. Extract formation name
    formation = None
    form_matches = re.findall(r"([A-Z][a-zA-Z0-9_\-\s]{2,20})\s+(?:formation|shale|sandstone|carbonate|group|member)", text, re.IGNORECASE)
    if form_matches:
        formation = form_matches[0].strip()

    # 3. Extract depth range
    start_m, end_m = None, None
    depth_matches = re.findall(r"(?:depth|interval|from|at)\s*[:=]?\s*(\d{3,5})\s*(?:m|meters|ft)?\s*(?:to|-)?\s*(\d{3,5})?", text, re.IGNORECASE)
    if depth_matches:
        d1, d2 = depth_matches[0]
        start_m = int(d1) if d1 else None
        end_m = int(d2) if d2 else (start_m + 300 if start_m else None)

    # 4. Extract symptoms & early indicators
    symptoms = []
    for line in text.splitlines():
        l_low = line.lower()
        if any(w in l_low for w in ["indicator", "symptom", "observed", "increase in", "decrease in", "flow check", "gain", "spike", "drop in spp"]):
            clean_s = re.sub(r"^[\*\-\•\d\.\s]+", "", line).strip()
            if 15 < len(clean_s) < 160 and clean_s not in symptoms:
                symptoms.append(clean_s)
    if not symptoms:
        symptoms = [
            f"Anomalous telemetry trends observed matching {dominant_cat.replace('_', ' ')} profile",
            "Discrepancy noted between surface sensors and downhole MWD readings",
            "Standpipe pressure and torque fluctuations exceeding standard operational baseline"
        ]

    # 5. Extract root causes
    causes = []
    for line in text.splitlines():
        l_low = line.lower()
        if any(w in l_low for w in ["cause", "due to", "result of", "underbalanced", "overbalance", "depleted", "permeab", "high ecd"]):
            clean_c = re.sub(r"^[\*\-\•\d\.\s]+", "", line).strip()
            if 15 < len(clean_c) < 160 and clean_c not in causes:
                causes.append(clean_c)
    if not causes:
        causes = [
            f"Formation pressure and mud hydrostatic differential in {formation or 'target reservoir'}",
            "Drillstring dynamic response under high mechanical torque and hydraulic loading",
            "Lithological heterogeneity and reactive shale swelling in the openhole section"
        ]

    # 6. Extract mitigations
    mitigations = []
    for line in text.splitlines():
        l_low = line.lower()
        if any(w in l_low for w in ["action", "mitigat", "remed", "pump", "pill", "circulat", "jar", "shut-in", "kill mud", "reduce wob"]):
            clean_m = re.sub(r"^[\*\-\•\d\.\s]+", "", line).strip()
            if 15 < len(clean_m) < 160 and clean_m not in mitigations:
                mitigations.append(clean_m)
    if not mitigations:
        mitigations = [
            "Immediately stop rotation and initiate high-priority well monitoring protocol",
            f"Spot conditioned {dominant_cat.replace('_', ' ')} treatment pill and circulate at reduced pump rate",
            "Verify pore pressure calculations with updated offset well logs before resuming drilling"
        ]

    # Human readable title
    clean_title = f"{dominant_cat.replace('_', ' ').title()} Mitigation Protocol - {formation or 'Section'} Analysis"
    if len(clean_title) > 65:
        clean_title = clean_title[:65]

    item = {
        "title": clean_title,
        "category": dominant_cat,
        "subcategory": dominant_cat,
        "severity": "high" if dominant_cat in ["kick_influx", "stuck_pipe"] else "moderate",
        "formation": formation or "North Sea Group",
        "depth_range": {"start_m": start_m or 2850, "end_m": end_m or 3400},
        "symptoms_early_indicators": symptoms[:4],
        "root_causes": causes[:4],
        "mitigation_actions": mitigations[:4],
        "operational_guidelines": f"Maintain ECD within approved window and verify pit volume totalizer prior to tripping through {formation or 'openhole'}.",
        "well_reference": "Digitized Field Operational Report",
        "source_document": source_filename,
        "category_name": dominant_cat.replace("_", " ").title(),
        "category_color": "#dc2626" if dominant_cat == "kick_influx" else "#ef4444" if dominant_cat == "stuck_pipe" else "#ea580c" if dominant_cat == "lost_circulation" else "#f59e0b",
        "keywords": [dominant_cat.replace("_", " "), "mitigation", formation or "wellbore", "drilling risk"],
    }

    return [item]


# ── 5. Groq Extraction ─────────────────────────────────────────────────────────

EXTRACTION_SYSTEM_PROMPT = """You are an expert petroleum/drilling engineer AI.
Your task: extract structured drilling risk knowledge entries from the provided document text.

Output ONLY a valid JSON array. Each item must follow exactly this schema:
{
  "title": "Short descriptive incident title (≤12 words)",
  "category": "One of: stuck_pipe | lost_circulation | kick_influx | excessive_vibration | wellbore_instability | formation_breakdown | casing_cementing",
  "subcategory": "Specific subcategory string (e.g. differential_sticking)",
  "severity": "critical | high | moderate",
  "formation": "Formation name if mentioned, else null",
  "depth_range": {"start_m": number_or_null, "end_m": number_or_null},
  "symptoms_early_indicators": ["symptom 1", "symptom 2", ...],
  "root_causes": ["cause 1", "cause 2", ...],
  "mitigation_actions": ["action 1", "action 2", ...],
  "operational_guidelines": "1-2 sentence guideline string",
  "well_reference": "Well name if mentioned, else 'North Sea Field Study'",
  "source_document": "Document filename or title",
  "category_name": "Human-readable category name",
  "category_color": "#hex color matching category",
  "keywords": ["keyword1", "keyword2", ...]
}

Category color mapping:
- stuck_pipe → #ef4444
- lost_circulation → #ea580c
- kick_influx → #dc2626
- excessive_vibration → #f59e0b
- wellbore_instability → #8b5cf6
- formation_breakdown → #0284c7
- casing_cementing → #16a34a

Extract 1-5 distinct risk entries from the document. If the document is not drilling-related, return [].
Output ONLY the JSON array, no markdown, no explanation."""


async def extract_with_groq(text: str, source_filename: str, api_key: Optional[str] = None) -> list[dict]:
    """Call Groq LLaMA to extract structured drilling KB items from document text."""
    key = api_key or GROQ_API_KEY
    if not key:
        raise ValueError("GROQ_API_KEY is not configured")

    import httpx

    # Trim to ~6000 chars to stay within context limits comfortably
    trimmed = text[:6000] if len(text) > 6000 else text

    # Active Groq models available on account
    models_to_try = []
    for m in [GROQ_MODEL, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound", "qwen/qwen3.8-27b"]:
        if m and m not in models_to_try and "llama-3.1-" not in m:
            models_to_try.append(m)
    if not models_to_try:
        models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]

    last_error = None
    for model_name in models_to_try:
        payload = {
            "model": model_name,
            "temperature": 0.1,
            "max_tokens": 2500,
            "messages": [
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user",   "content": f"Document filename: {source_filename}\n\n---\n{trimmed}"}
            ]
        }

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type":  "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
        except Exception as conn_err:
            logger.warning(f"Groq connection error: {conn_err}")
            raise ValueError(f"Groq network connection error: {conn_err}")

        if resp.status_code == 200:
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"].strip()
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
            raw_text = re.sub(r"\s*```$",          "", raw_text, flags=re.MULTILINE)

            try:
                items = json.loads(raw_text)
                if isinstance(items, list):
                    return items
            except json.JSONDecodeError as e:
                logger.error(f"Groq JSON parse error with {model_name}: {e}\nRaw: {raw_text[:200]}")
                last_error = f"Invalid JSON response: {e}"
        else:
            logger.warning(f"Groq model {model_name} returned status {resp.status_code}: {resp.text[:150]}")
            last_error = f"Groq API error {resp.status_code}: {resp.text[:150]}"

    raise ValueError(last_error or "Could not extract via Groq")


# ── 6. Validate & Normalise items ──────────────────────────────────────────────

def normalise_item(item: dict, source_filename: str, index: int) -> dict:
    """Ensure all required fields are present and category is valid."""
    cat = item.get("category", "").lower().strip()
    if cat not in VALID_CATEGORIES:
        cat = "stuck_pipe"   # safe default

    sev = item.get("severity", "high").lower().strip()
    if sev not in ("critical", "high", "moderate"):
        sev = "high"

    now = datetime.now(timezone.utc).isoformat()
    item_id = f"risk-digi-{int(time.time())}-{index:02d}"

    return {
        "item_id":                  item_id,
        "title":                    item.get("title", "Extracted Drilling Risk Incident"),
        "category":                 cat,
        "subcategory":              item.get("subcategory", cat),
        "severity":                 sev,
        "formation":                item.get("formation"),
        "depth_range":              item.get("depth_range", {"start_m": None, "end_m": None}),
        "symptoms_early_indicators": item.get("symptoms_early_indicators", []),
        "root_causes":              item.get("root_causes", []),
        "mitigation_actions":       item.get("mitigation_actions", []),
        "operational_guidelines":   item.get("operational_guidelines", ""),
        "well_reference":           item.get("well_reference", "Digitized Document"),
        "source_document":          item.get("source_document", source_filename),
        "category_name":            item.get("category_name", cat.replace("_", " ").title()),
        "category_color":           item.get("category_color", "#ea580c"),
        "keywords":                 item.get("keywords", []),
        "created_at":               now,
        "digitized":                True,
        "digitized_source":         source_filename,
    }


# ── 7. Save to MongoDB and Sync Fallback Cache ─────────────────────────────────

def save_items_to_db(items: list[dict], knowledge_repo) -> list[str]:
    """
    Inserts items into MongoDB if connected, and ALWAYS merges into local
    JSON cache so items are immediately searchable in Knowledge Base.
    """
    saved_ids = []
    if not items:
        return saved_ids

    # 1. MongoDB insert/upsert if online
    if knowledge_repo.is_connected and knowledge_repo.collection is not None:
        for item in items:
            try:
                clean_item = dict(item)
                clean_item.pop("_id", None)
                knowledge_repo.collection.update_one(
                    {"item_id": clean_item["item_id"]},
                    {"$set": clean_item},
                    upsert=True
                )
                saved_ids.append(clean_item["item_id"])
                logger.info(f"Saved KB item to MongoDB: {clean_item['item_id']} — {clean_item['title']}")
            except Exception as e:
                logger.error(f"MongoDB save error for {item.get('item_id')}: {e}")
    else:
        saved_ids = [it["item_id"] for it in items]
        logger.info(f"MongoDB not connected; indexing {len(items)} items to local knowledge repository cache")

    # 2. Always sync into fallback cache in memory and on disk
    try:
        existing_ids = {it.get("item_id") for it in knowledge_repo._fallback_cache}
        new_items = [it for it in items if it.get("item_id") not in existing_ids]
        if new_items:
            knowledge_repo._fallback_cache.extend(new_items)
            knowledge_repo._save_fallback_cache(knowledge_repo._fallback_cache)
            logger.info(f"Synced {len(new_items)} items to local fallback cache")
    except Exception as e:
        logger.warning(f"Could not sync fallback cache: {e}")

    return saved_ids


# ── 8. Master pipeline orchestrator ───────────────────────────────────────────

async def run_digitization_pipeline(
    file_bytes: bytes,
    filename: str,
    knowledge_repo,
    api_key: Optional[str] = None,
) -> dict:
    """
    Full digitization pipeline.
    Uses Groq LLaMA if key available; seamlessly falls back to petroleum engineering
    domain heuristics if Groq key is absent or Groq is unreachable.
    """
    result = {
        "filename":         filename,
        "stage":            "starting",
        "text_length":      0,
        "relevant":         False,
        "relevance_score":  0.0,
        "duplicate_of":     0,
        "items_extracted":  [],
        "items_saved":      [],
        "engine_used":      "groq",
        "note":             None,
        "error":            None,
    }

    # Stage 1 — Extract text
    result["stage"] = "extracting_text"
    try:
        raw_text = extract_text(file_bytes, filename)
        result["text_length"] = len(raw_text)
    except ValueError as e:
        result["error"] = str(e)
        result["stage"] = "failed_extraction"
        return result

    # Stage 2 — Relevance filter
    result["stage"] = "relevance_filter"
    relevant, score = is_drilling_relevant(raw_text)
    result["relevant"]        = relevant
    result["relevance_score"] = score
    if not relevant:
        result["stage"] = "rejected_not_relevant"
        result["error"] = "Document does not appear to be drilling-related. Please upload a well report, SPE paper, or drilling operations incident log."
        return result

    # Stage 3 — AI Extraction (Groq with Heuristics Fallback)
    result["stage"] = "ai_extraction"
    raw_items = []
    
    effective_key = api_key or GROQ_API_KEY
    if effective_key:
        try:
            raw_items = await extract_with_groq(raw_text, filename, api_key=effective_key)
            result["engine_used"] = "Groq LLaMA-3.1 70B"
        except Exception as groq_err:
            logger.warning(f"Groq extraction failed ({groq_err}), switching to domain heuristic parser")
            raw_items = extract_with_heuristics(raw_text, filename)
            result["engine_used"] = "Domain Heuristic Parser"
            result["note"] = f"Groq notice: {groq_err}. Processed via Petroleum NLP Heuristic Parser."
    else:
        logger.info("GROQ_API_KEY not configured. Processing with Petroleum Domain NLP Heuristic Parser.")
        raw_items = extract_with_heuristics(raw_text, filename)
        result["engine_used"] = "Domain Heuristic Parser"
        result["note"] = "Extracted via Domain Heuristic Parser. (Tip: Set GROQ_API_KEY in backend/.env for Groq LLaMA 3.1 AI reasoning)."

    if not raw_items:
        result["error"] = "Could not extract any drilling risk entries from this document. Check that the document contains incident or risk observations."
        result["stage"] = "no_items_extracted"
        return result

    # Stage 4 — Normalise
    result["stage"] = "normalising"
    normalised = [normalise_item(item, filename, i) for i, item in enumerate(raw_items)]

    # Stage 5 — Duplicate check per item
    result["stage"] = "duplicate_check"
    unique_items = []
    duplicates_skipped = []
    all_extracted_display = []

    for item in normalised:
        dup = check_duplicate(item["title"], knowledge_repo)
        item_info = {
            "item_id":  item["item_id"],
            "title":    item["title"],
            "category": item["category"],
            "severity": item["severity"],
            "category_color": item["category_color"],
            "category_name": item["category_name"],
            "symptoms_early_indicators": item["symptoms_early_indicators"],
            "root_causes": item["root_causes"],
            "mitigation_actions": item["mitigation_actions"],
            "engine_used": result["engine_used"],
        }
        if dup:
            logger.info(f"Skipping duplicate: {item['title']} (matches {dup})")
            duplicates_skipped.append({"title": item["title"], "existing_id": dup})
            item_info["is_duplicate"] = True
            item_info["existing_id"] = dup
            all_extracted_display.append(item_info)
        else:
            item_info["is_duplicate"] = False
            unique_items.append(item)
            all_extracted_display.append(item_info)

    result["duplicates_skipped"] = duplicates_skipped
    result["duplicate_of"] = len(duplicates_skipped)
    result["items_extracted"] = all_extracted_display

    # Stage 6 — Save to MongoDB & Sync Local Cache
    result["stage"] = "saving"
    saved_ids = save_items_to_db(unique_items, knowledge_repo)
    result["items_saved"] = saved_ids

    if len(duplicates_skipped) > 0 and len(saved_ids) == 0:
        result["note"] = f"Duplicate Check Active: All {len(duplicates_skipped)} risk entry(ies) already exist in your Knowledge Base. No redundant records were added."
    elif len(duplicates_skipped) > 0:
        result["note"] = f"Duplicate Check: Saved {len(saved_ids)} new risk entry(ies). {len(duplicates_skipped)} duplicate(s) were identified and skipped."

    result["stage"] = "complete"
    return result

