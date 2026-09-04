"""
chroma_service.py — ChromaDB Vector Search Engine for DrillInsight Knowledge Repository

Provides semantic vector search across drilling hazards, early symptoms,
root causes, operational mitigations, and casing/wellbore guidelines.

Features:
- Embedded persistent vector database (stored in backend/data/chroma_db)
- Cosine distance metric for semantic similarity
- Category-level metadata filtering ("yeh wala voh wala risk sabka alag")
- Automatic sync from MongoDB Atlas risk_knowledge collection
- Graceful lexical fallback if chromadb is initializing or running in slim mode
"""

import os
import json
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger("drillinsight.chroma")

CHROMA_DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "chroma_db")
COLLECTION_NAME = "drilling_risk_vectors"


class ChromaSearchService:
    def __init__(self, persist_dir: str = CHROMA_DATA_DIR):
        self.persist_dir = persist_dir
        self.client = None
        self.collection = None
        self.is_ready = False
        self._init_chroma()

    def _init_chroma(self):
        """Initializes ChromaDB persistent client."""
        try:
            import chromadb
            from chromadb.config import Settings

            os.makedirs(self.persist_dir, exist_ok=True)
            self.client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False)
            )
            # Create or get collection with cosine similarity
            self.collection = self.client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
            self.is_ready = True
            logger.info(f"ChromaDB initialized at {self.persist_dir} [collection: {COLLECTION_NAME}]")
        except Exception as e:
            self.is_ready = False
            logger.warning(f"ChromaDB not initialized ({e}). Semantic search will use smart token similarity fallback.")

    def sync_from_knowledge(self, items: List[Dict[str, Any]]) -> int:
        """
        Syncs structured knowledge records from MongoDB Atlas into ChromaDB vector index.
        """
        if not self.is_ready or self.collection is None or not items:
            return 0

        documents = []
        metadatas = []
        ids = []

        for idx, item in enumerate(items):
            item_id = item.get("item_id") or f"risk-vec-{idx+1:03d}"
            title = item.get("title", "")
            category = item.get("category", "general")
            formation = item.get("formation", "")
            severity = item.get("severity", "medium")
            symptoms = " ".join(item.get("symptoms_early_indicators", []))
            causes = " ".join(item.get("root_causes", []))
            mitigations = " ".join(item.get("mitigation_actions", []))
            guidelines = item.get("operational_guidelines", "")
            keywords = " ".join(item.get("keywords", []))

            # Rich semantic document representation
            doc_text = (
                f"Hazard: {title}. "
                f"Category: {category}. "
                f"Formation: {formation}. "
                f"Early Warning Symptoms: {symptoms}. "
                f"Root Causes: {causes}. "
                f"Mitigation Actions & Remediation: {mitigations}. "
                f"Operational Guidelines: {guidelines}. "
                f"Keywords: {keywords}"
            )

            # Metadata for fast filtering & retrieval
            metadata = {
                "item_id": str(item_id),
                "title": str(title),
                "category": str(category),
                "severity": str(severity),
                "formation": str(formation),
                "source_document": str(item.get("source_document", "")),
                "well_reference": str(item.get("well_reference", "")),
                "depth_start": float(item.get("depth_range", {}).get("start_m", 0.0)),
                "depth_end": float(item.get("depth_range", {}).get("end_m", 0.0)),
                "raw_json": json.dumps(item, default=str),
            }

            documents.append(doc_text)
            metadatas.append(metadata)
            ids.append(item_id)

        try:
            self.collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            logger.info(f"Indexed {len(ids)} documents in ChromaDB vector store.")
            return len(ids)
        except Exception as e:
            logger.error(f"Failed to upsert vectors into ChromaDB: {e}")
            return 0

    def semantic_search(
        self,
        query: str,
        category: Optional[str] = None,
        top_k: int = 5,
        all_items_fallback: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes semantic vector search with optional category filter.
        """
        query_str = query.strip()
        if not query_str:
            return []

        # 1. Native ChromaDB vector query if ready
        if self.is_ready and self.collection is not None:
            try:
                where_clause = {"category": category} if category else None
                results = self.collection.query(
                    query_texts=[query_str],
                    n_results=min(top_k, 25),
                    where=where_clause
                )

                output = []
                if results and results.get("ids") and len(results["ids"]) > 0:
                    matched_ids = results["ids"][0]
                    distances = results["distances"][0] if results.get("distances") else [0.5] * len(matched_ids)
                    metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(matched_ids)

                    for mid, dist, meta in zip(matched_ids, distances, metadatas):
                        # Cosine similarity calculation (1 - distance)
                        similarity = round(max(0.0, min(1.0, 1.0 - dist)), 3)
                        
                        raw_doc = {}
                        if meta.get("raw_json"):
                            try:
                                raw_doc = json.loads(meta["raw_json"])
                            except Exception:
                                pass

                        output.append({
                            **raw_doc,
                            "item_id": mid,
                            "title": meta.get("title", raw_doc.get("title")),
                            "category": meta.get("category", raw_doc.get("category")),
                            "severity": meta.get("severity", raw_doc.get("severity")),
                            "formation": meta.get("formation", raw_doc.get("formation")),
                            "source_document": meta.get("source_document", raw_doc.get("source_document")),
                            "similarity_score": similarity,
                            "vector_distance": round(dist, 4),
                            "search_engine": "chromadb_vector",
                        })

                    if output:
                        return output
            except Exception as e:
                logger.warning(f"Chroma query failed ({e}), falling back to smart token ranker.")

        # 2. Resilient Smart Similarity Fallback
        items = all_items_fallback or []
        query_words = set(query_str.lower().split())
        scored_items = []

        for item in items:
            if category and item.get("category") != category:
                continue

            doc_corpus = " ".join([
                str(item.get("title", "")),
                str(item.get("formation", "")),
                " ".join(item.get("symptoms_early_indicators", [])),
                " ".join(item.get("root_causes", [])),
                " ".join(item.get("mitigation_actions", [])),
                " ".join(item.get("keywords", [])),
            ]).lower()

            matches = sum(1 for w in query_words if w in doc_corpus)
            if matches > 0:
                sim = round(min(0.98, 0.45 + (matches / len(query_words)) * 0.50), 3)
                scored_items.append({
                    **item,
                    "similarity_score": sim,
                    "search_engine": "token_semantic_fallback",
                })

        scored_items.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)
        return scored_items[:top_k]


# Singleton instance
chroma_service = ChromaSearchService()
