"""
pipeline.py — Multi-Stage Drilling Risk ML Pipeline
Loads dataset, trains all 5 stages on startup (sampled for speed).
Saves trained models to a cache file so subsequent restarts are instant.
Exposes predict() for FastAPI to call.
"""

import os
import time
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import xgboost as xgb
import torch
import torch.nn as nn
from lifelines import CoxPHFitter

# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "mlmodel", "multiwell_from_real_volve.csv")
CACHE_DIR    = os.path.join(os.path.dirname(__file__), "model_cache")
CACHE_PATH   = os.path.join(CACHE_DIR, "pipeline_cache.pkl")
PINO_PATH    = os.path.join(CACHE_DIR, "pino_weights.pt")

FEATURE_ALIASES = {
    "depth":      lambda cols: [c for c in cols if "hole depth" in c.lower() or ("depth" in c.lower() and "tvd" not in c.lower())],
    "wob":        lambda cols: [c for c in cols if "weight on bit" in c.lower()],
    "rop":        lambda cols: [c for c in cols if "rate of penetration" in c.lower()],
    "torque":     lambda cols: [c for c in cols if "torque" in c.lower()],
    "hookload":   lambda cols: [c for c in cols if "hookload" in c.lower()],
    "mud_in":     lambda cols: [c for c in cols if "mud density in" in c.lower()],
    "spp":        lambda cols: [c for c in cols if "stand pipe pressure" in c.lower() or ("standpipe" in c.lower() and "pressure" in c.lower())],
    "shock":      lambda cols: [c for c in cols if "shock" in c.lower() and "peak" in c.lower()],
    "gas":        lambda cols: [c for c in cols if "gas" in c.lower() and "avg" in c.lower()],
    "rpm":        lambda cols: [c for c in cols if "rotary speed" in c.lower()],
}

# Human-readable names exposed to the frontend for sliders
PARAM_META = {
    "depth":    {"label": "Hole Depth", "unit": "m",       "min": 300,  "max": 6000, "step": 10,   "default": 2000},
    "wob":      {"label": "Weight on Bit", "unit": "kkgf", "min": 0,    "max": 120,  "step": 0.5,  "default": 30},
    "rop":      {"label": "Rate of Penetration", "unit": "m/h", "min": 0, "max": 100, "step": 0.5, "default": 25},
    "torque":   {"label": "Surface Torque", "unit": "kN.m","min": 0,    "max": 40,   "step": 0.1,  "default": 8},
    "hookload": {"label": "Hookload", "unit": "kkgf",      "min": 0,    "max": 300,  "step": 1,    "default": 100},
    "mud_in":   {"label": "Mud Density In", "unit": "g/cm³","min": 0.9, "max": 2.5,  "step": 0.01, "default": 1.2},
    "spp":      {"label": "Standpipe Pressure", "unit": "kPa","min": 0,  "max": 35000,"step": 100,  "default": 8000},
    "shock":    {"label": "MWD Shock Peak", "unit": "m/s²","min": 0,    "max": 200,  "step": 1,    "default": 0},
    "gas":      {"label": "Gas Average", "unit": "%",      "min": 0,    "max": 100,  "step": 0.1,  "default": 0.05},
    "rpm":      {"label": "Rotary Speed", "unit": "rpm",   "min": 0,    "max": 200,  "step": 1,    "default": 80},
}

RISK_TYPE_META = {
    "stuck_pipe":           {"label": "Stuck Pipe",          "icon": "anchor",         "description": "Drill string becomes immovable due to differential sticking, key seating, or pack-off."},
    "kick_influx":          {"label": "Kick / Influx",       "icon": "alert-triangle",  "description": "Unexpected formation fluid enters wellbore, potentially leading to a blowout."},
    "lost_circulation":     {"label": "Lost Circulation",    "icon": "droplets",        "description": "Drilling fluid escapes into formation fractures, causing mud loss."},
    "excessive_vibration":  {"label": "Excessive Vibration", "icon": "activity",        "description": "High BHA/drillstring vibration causing fatigue, bit damage, or MWD failure."},
    "normal":               {"label": "Normal",              "icon": "check-circle",    "description": "All parameters within safe operating range."},
}

WELL_GEO = {
    "Well_Real_Volve":        {"lat": 58.435, "lon": 1.902, "formation": "Hugin / Sleipner", "field": "Volve, North Sea", "country": "Norway"},
    "Well_Geo_Sister_1":      {"lat": 58.421, "lon": 1.875, "formation": "Hugin",             "field": "Volve Area, North Sea", "country": "Norway"},
    "Well_Geo_Sister_2":      {"lat": 58.448, "lon": 1.931, "formation": "Hugin",             "field": "Volve Area, North Sea", "country": "Norway"},
    "Well_Geo_Sister_3":      {"lat": 58.410, "lon": 1.862, "formation": "Hugin / Skagerrak", "field": "Volve Area, North Sea", "country": "Norway"},
    "Well_Formation_Sister_1":{"lat": 57.984, "lon": 2.251, "formation": "Joanne / Skagerrak","field": "Elgin-Franklin, North Sea", "country": "UK"},
    "Well_Formation_Sister_2":{"lat": 57.901, "lon": 2.135, "formation": "Joanne",             "field": "Shearwater, North Sea", "country": "UK"},
    "Well_Formation_Sister_3":{"lat": 57.742, "lon": 1.989, "formation": "Forties",            "field": "Forties, North Sea", "country": "UK"},
}

# ──────────────────────────────────────────────
# PINO model definition (PyTorch)
# ──────────────────────────────────────────────
class PINO(nn.Module):
    def __init__(self, n_features, embed_dim=16):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(n_features, 32), nn.ReLU(),
            nn.Linear(32, embed_dim), nn.Tanh()
        )
        self.physics_head = nn.Sequential(
            nn.Linear(embed_dim, 8), nn.ReLU(),
            nn.Linear(8, 2)
        )

    def forward(self, x):
        z = self.encoder(x)
        physics_pred = self.physics_head(z)
        return z, physics_pred


# ──────────────────────────────────────────────
# Pipeline singleton
# ──────────────────────────────────────────────
class DrillingRiskPipeline:
    def __init__(self):
        self.ready = False
        self.col_map = {}        # alias → actual column name
        self.feature_cols = []   # ordered list of actual column names used
        self.feature_aliases = []# ordered list of alias keys
        self.scaler = None
        self.pino = None
        self.embed_dim = 16
        self.xgb_clf = None
        self.le = None
        self.iso_forest = None
        self.cph = None
        self.df_sample = None        # stratified sample for similar-well lookup
        self.well_risk_cache = {}    # {well_name: {risk_type: row_dict}} — always-visible table
        self.param_ranges = {}

    # ── Cache helpers ─────────────────────────
    def save_to_cache(self):
        """Persist all trained artefacts to disk so the next restart is instant."""
        os.makedirs(CACHE_DIR, exist_ok=True)
        # Save PyTorch PINO weights separately (torch.save is safer than pickle for nn.Module)
        torch.save(self.pino.state_dict(), PINO_PATH)
        cache = {
            "col_map":         self.col_map,
            "feature_cols":    self.feature_cols,
            "feature_aliases": self.feature_aliases,
            "embed_dim":       self.embed_dim,
            "scaler":          self.scaler,
            "xgb_clf":         self.xgb_clf,
            "le":              self.le,
            "iso_forest":      self.iso_forest,
            "cph":             self.cph,
            "cph_feature_names": getattr(self, "cph_feature_names", []),
            "df_sample":       self.df_sample,
            "well_risk_cache": self.well_risk_cache,
            "param_ranges":    self.param_ranges,
            "snapshot_feats":  self.snapshot_feats,
            "depth_col":       self.depth_col,
            "embed_cols":      self.embed_cols,
            "pino_n_features": len(self.feature_cols),
        }
        joblib.dump(cache, CACHE_PATH, compress=3)
        print(f"[pipeline] Cache saved to {CACHE_PATH}")

    def load_from_cache(self) -> bool:
        """Try to restore from cache. Returns True if successful."""
        if not os.path.exists(CACHE_PATH) or not os.path.exists(PINO_PATH):
            return False
        try:
            t0 = time.time()
            print("[pipeline] Cache found — loading models from disk...")
            cache = joblib.load(CACHE_PATH)
            self.col_map          = cache["col_map"]
            self.feature_cols     = cache["feature_cols"]
            self.feature_aliases  = cache["feature_aliases"]
            self.embed_dim        = cache["embed_dim"]
            self.scaler           = cache["scaler"]
            self.xgb_clf          = cache["xgb_clf"]
            self.le               = cache["le"]
            self.iso_forest       = cache["iso_forest"]
            self.cph              = cache["cph"]
            self.cph_feature_names = cache.get("cph_feature_names", [])
            self.df_sample        = cache["df_sample"]
            self.well_risk_cache  = cache["well_risk_cache"]
            self.param_ranges     = cache["param_ranges"]
            self.snapshot_feats   = cache["snapshot_feats"]
            self.depth_col        = cache["depth_col"]
            self.embed_cols       = cache["embed_cols"]
            # Restore PINO weights
            n_feat = cache["pino_n_features"]
            self.pino = PINO(n_features=n_feat, embed_dim=self.embed_dim)
            self.pino.load_state_dict(torch.load(PINO_PATH, map_location="cpu"))
            self.pino.eval()
            self.ready = True
            print(f"[pipeline] Loaded from cache in {time.time()-t0:.1f}s — ready!")
            return True
        except Exception as ex:
            print(f"[pipeline] Cache load failed ({ex}), will retrain.")
            return False

    # ── Load & train ──────────────────────────
    def load_and_train(self, sample_size=200_000):
        # ── Try loading from cache first ──
        if self.load_from_cache():
            return
        t0 = time.time()
        print(f"[pipeline] Loading dataset from {DATASET_PATH} ...")
        df = pd.read_csv(DATASET_PATH, low_memory=False)
        print(f"[pipeline] Loaded {len(df)} rows in {time.time()-t0:.1f}s")

        # resolve column names
        cols = df.columns.tolist()
        for alias, resolver in FEATURE_ALIASES.items():
            matches = resolver(cols)
            if matches:
                self.col_map[alias] = matches[0]
        print("[pipeline] Column map:", self.col_map)

        self.feature_aliases = [k for k in FEATURE_ALIASES if k in self.col_map and k != "depth"]
        self.feature_cols    = [self.col_map[k] for k in self.feature_aliases]
        depth_col = self.col_map.get("depth", "Hole depth (MD) m")

        # collect param ranges for frontend sliders
        for alias in self.feature_aliases:
            col = self.col_map[alias]
            self.param_ranges[alias] = {
                "min": float(df[col].quantile(0.01)),
                "max": float(df[col].quantile(0.99)),
            }
        self.param_ranges["depth"] = {
            "min": float(df[depth_col].quantile(0.01)),
            "max": float(df[depth_col].quantile(0.99)),
        }

        required = self.feature_cols + [depth_col, "risk_label", "risk_type", "well_name", "similarity_group"]
        df = df.dropna(subset=required).reset_index(drop=True)

        # stratified subsample
        df = (
            df.groupby("well_name", group_keys=False)
            .apply(lambda g: g.sample(min(len(g), sample_size // df["well_name"].nunique()), random_state=42))
            .reset_index(drop=True)
        )
        print(f"[pipeline] Using {len(df)} rows for training")

        # ── Build similar-well lookup table (always-visible) ──────────
        # Stratify: for each (similarity_group, risk_type) pair keep 200 rows
        # so every sister well appears in the table regardless of current state.
        self.df_sample = (
            df.groupby(["well_name", "risk_type", "similarity_group"], group_keys=False)
            .apply(lambda g: g.sample(min(len(g), 200), random_state=42))
            .reset_index(drop=True)
        )
        # Pre-build a per-risk_type representative row for each well
        # so we can guarantee all 7 wells appear in the table.
        self.well_risk_cache = self._build_well_risk_cache(self.df_sample)

        # ── Stage 1: PINO ────────────────────
        print("[pipeline] Training PINO ...")
        self.scaler = StandardScaler()
        X_all = self.scaler.fit_transform(df[self.feature_cols].values)
        X_tensor = torch.tensor(X_all, dtype=torch.float32)

        torque_idx = self.feature_aliases.index("torque") if "torque" in self.feature_aliases else 0
        rop_idx    = self.feature_aliases.index("rop")    if "rop"    in self.feature_aliases else 1
        true_torque = X_tensor[:, torque_idx:torque_idx+1]
        true_rop    = X_tensor[:, rop_idx:rop_idx+1]

        self.pino = PINO(n_features=len(self.feature_cols), embed_dim=self.embed_dim)
        optimizer = torch.optim.Adam(self.pino.parameters(), lr=1e-3)
        mse_loss  = nn.MSELoss()
        batch_size = 4096
        n_samples  = X_tensor.shape[0]

        for epoch in range(3):
            perm = torch.randperm(n_samples)
            epoch_loss = 0.0
            for i in range(0, n_samples, batch_size):
                idx = perm[i:i+batch_size]
                xb = X_tensor[idx]
                z, phys = self.pino(xb)
                loss = mse_loss(phys[:, 0:1], true_torque[idx]) + mse_loss(phys[:, 1:2], true_rop[idx])
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item() * xb.shape[0]
            print(f"  PINO epoch {epoch+1}/3 loss={epoch_loss/n_samples:.4f}")

        self.pino.eval()
        with torch.no_grad():
            Z_all, _ = self.pino(X_tensor)
        Z_all = Z_all.numpy()
        embed_cols = [f"emb_{i}" for i in range(self.embed_dim)]
        df_embed = pd.DataFrame(Z_all, columns=embed_cols)

        # ── Stage 2: XGBoost Snapshot Classifier ──
        print("[pipeline] Training XGBoost classifier ...")
        snapshot_feats = self.feature_cols + embed_cols + [depth_col]
        df_for_clf = pd.concat([df.reset_index(drop=True), df_embed], axis=1)

        X = df_for_clf[snapshot_feats].values
        y = df_for_clf["risk_type"].values

        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

        self.le = LabelEncoder()
        y_tr_enc = self.le.fit_transform(y_tr)
        y_te_enc = self.le.transform(y_te)

        self.xgb_clf = xgb.XGBClassifier(
            n_estimators=200, max_depth=7, learning_rate=0.1,
            objective="multi:softprob", num_class=len(self.le.classes_),
            eval_metric="mlogloss", n_jobs=-1, random_state=42,
            verbosity=0,
        )
        self.xgb_clf.fit(X_tr, y_tr_enc)
        print(f"  XGBoost trained. Classes: {self.le.classes_}")

        # ── Stage 3: Isolation Forest ──
        print("[pipeline] Training Isolation Forest ...")
        normal_mask = df["risk_type"] == "normal"
        X_normal = np.hstack([
            self.scaler.transform(df.loc[normal_mask, self.feature_cols].values),
            Z_all[normal_mask.values]
        ])
        self.iso_forest = IsolationForest(n_estimators=150, contamination=0.05, random_state=42, n_jobs=-1)
        self.iso_forest.fit(X_normal)
        print("  Isolation Forest trained.")

        # ── Stage 4: Cox PH (simplified — use XGBoost risk score as covariate) ──
        print("[pipeline] Fitting Cox PH model ...")
        try:
            surv_rows = []
            for well in df["well_name"].unique():
                wdf = df[df["well_name"] == well].reset_index(drop=True)
                risk_col = wdf["risk_type"].values
                incident_pos = np.where(risk_col != "normal")[0]
                sample_idx = np.random.choice(len(wdf), size=min(len(wdf), 500), replace=False)
                sample_idx.sort()
                for i in sample_idx:
                    fut = incident_pos[incident_pos > i]
                    duration = int(fut[0] - i) if len(fut) > 0 else int(len(wdf) - i)
                    event_obs = 1 if len(fut) > 0 else 0
                    row_scaled = self.scaler.transform([wdf.iloc[i][self.feature_cols].values])[0]
                    surv_rows.append(list(row_scaled) + [float(duration), float(event_obs)])

            surv_df = pd.DataFrame(surv_rows, columns=[f"f{i}" for i in range(len(self.feature_cols))] + ["duration", "event_observed"])
            surv_df = surv_df[surv_df["duration"] > 0].dropna()
            self.cph = CoxPHFitter(penalizer=0.5)
            self.cph.fit(surv_df, duration_col="duration", event_col="event_observed")
            print("  Cox PH fitted.")
            self.cph_feature_names = [f"f{i}" for i in range(len(self.feature_cols))]
        except Exception as ex:
            print(f"  Cox PH failed ({ex}), using heuristic fallback.")
            self.cph = None
            self.cph_feature_names = []

        self.snapshot_feats = snapshot_feats
        self.depth_col      = depth_col
        self.embed_cols     = embed_cols
        self.ready = True
        print(f"[pipeline] Pipeline ready in {time.time()-t0:.1f}s")

        # ── Save all artefacts to cache for next startup ──
        try:
            self.save_to_cache()
        except Exception as ex:
            print(f"[pipeline] Warning: could not save cache ({ex})")


    # ── Embed one row ──────────────────────────
    def _embed(self, x_scaled: np.ndarray) -> np.ndarray:
        t = torch.tensor(x_scaled, dtype=torch.float32)
        with torch.no_grad():
            z, _ = self.pino(t.unsqueeze(0))
        return z.numpy()[0]

    # ── Main predict function ──────────────────
    def predict(self, params: dict) -> dict:
        """
        params: dict with alias keys (depth, wob, rop, …) → float values
        Returns full pipeline output.
        """
        # build raw feature vector in correct column order
        raw = np.array([params.get(alias, PARAM_META.get(alias, {}).get("default", 0.0))
                        for alias in self.feature_aliases], dtype=np.float32)
        depth_val = params.get("depth", PARAM_META["depth"]["default"])

        x_scaled = self.scaler.transform([raw])[0]
        emb      = self._embed(x_scaled)

        # Stage 2: snapshot risk probabilities
        snap_input = np.concatenate([x_scaled, emb, [depth_val]]).reshape(1, -1)
        probs_arr  = self.xgb_clf.predict_proba(snap_input)[0]
        risk_probs = {cls: float(p) for cls, p in zip(self.le.classes_, probs_arr)}

        # dominant risk type
        dominant = max(risk_probs, key=risk_probs.get)
        dominant_prob = risk_probs[dominant]

        # overall risk level
        non_normal_prob = 1.0 - risk_probs.get("normal", 0.0)
        if non_normal_prob < 0.30:
            risk_level = "normal"
        elif non_normal_prob < 0.60:
            risk_level = "medium"
        else:
            risk_level = "high"

        # Stage 3: Isolation Forest anomaly
        iso_input     = np.concatenate([x_scaled, emb]).reshape(1, -1)
        anomaly_score = float(self.iso_forest.decision_function(iso_input)[0])
        is_anomaly    = bool(self.iso_forest.predict(iso_input)[0] == -1)

        # Stage 4: time-to-incident (Cox PH or heuristic)
        time_to_incident_hours = None
        if self.cph is not None:
            try:
                row_dict = {f"f{i}": float(x_scaled[i]) for i in range(len(self.feature_cols))}
                row_df = pd.DataFrame([row_dict])
                median_rows = float(self.cph.predict_median(row_df).iloc[0])
                # convert rows → hours (assuming ~1 row per minute based on Volve data)
                time_to_incident_hours = round(median_rows / 60.0, 1)
            except Exception:
                pass

        if time_to_incident_hours is None:
            # heuristic fallback: risk → estimated hours
            if non_normal_prob < 0.15:
                time_to_incident_hours = 999.0
            else:
                time_to_incident_hours = round(max(0.5, (1.0 - non_normal_prob) * 48), 1)

        # Stage 5: similar wells lookup
        similar_wells = self._find_similar_wells(params, dominant, risk_probs)

        return {
            "risk_level": risk_level,
            "risk_type": dominant if dominant != "normal" else "normal",
            "risk_probabilities": risk_probs,
            "overall_risk_percent": round(non_normal_prob * 100, 1),
            "anomaly_score": round(anomaly_score, 4),
            "is_anomaly": is_anomaly,
            "time_to_incident_hours": time_to_incident_hours,
            "similar_wells": similar_wells,
        }

    # ── Pre-build well/risk representative cache ──
    def _build_well_risk_cache(self, df_sample) -> dict:
        """
        For each well, pick the single most representative row per risk_type
        (the row closest to the mean of that well+risk_type group).
        Returns: {well_name: {risk_type: row_dict}}
        """
        cache = {}
        for (wn, rt), grp in df_sample.groupby(["well_name", "risk_type"]):
            feat_vals = grp[self.feature_cols].values
            mean_vec  = feat_vals.mean(axis=0)
            dists = np.linalg.norm(feat_vals - mean_vec, axis=1)
            best_row = grp.iloc[np.argmin(dists)]
            cache.setdefault(wn, {})[rt] = best_row.to_dict()
        return cache

    # ── Similar wells lookup — always shows all sister wells ──
    def _find_similar_wells(self, params: dict, dominant_risk: str, risk_probs: dict) -> list:
        """
        Always returns one entry per well from the dataset, showing the risk
        type that best matches the current dominant risk.
        Geographic and geological sisters are always included.
        Rows are ranked by parameter-space proximity.
        """
        if not self.well_risk_cache:
            return []

        input_vec = np.array(
            [params.get(alias, PARAM_META.get(alias, {}).get("default", 0.0))
             for alias in self.feature_aliases],
            dtype=float
        )

        # Risk priority: prefer dominant non-normal risk, fall back to any non-normal, then normal
        def pick_risk_row(well_risks: dict):
            """Pick the best row to represent this well given current risk context."""
            # 1) exact match to dominant non-normal risk
            if dominant_risk != "normal" and dominant_risk in well_risks:
                return well_risks[dominant_risk], dominant_risk
            # 2) any non-normal risk this well has, closest to current dominant by prob
            non_normal_keys = [k for k in well_risks if k != "normal"]
            if non_normal_keys:
                # pick whichever non-normal risk has highest probability right now
                best_k = max(non_normal_keys, key=lambda k: risk_probs.get(k, 0))
                return well_risks[best_k], best_k
            # 3) fall back to normal
            return well_risks.get("normal"), "normal"

        def row_dist(row_dict):
            if row_dict is None:
                return 1e9
            rv = np.array([row_dict.get(col, 0.0) for col in self.feature_cols], dtype=float)
            mask = np.isnan(rv)
            rv[mask] = 0.0
            iv = input_vec.copy()
            iv[mask] = 0.0
            return float(np.linalg.norm(rv - iv))

        rows = []
        for wn, well_risks in self.well_risk_cache.items():
            chosen_row, chosen_rt = pick_risk_row(well_risks)
            if chosen_row is None:
                continue
            d = row_dist(chosen_row)
            rows.append((d, wn, chosen_rt, chosen_row))

        # sort by distance so closest wells appear first
        rows.sort(key=lambda x: x[0])

        results = []
        for d, wn, rt, row in rows:
            geo = WELL_GEO.get(wn, {})
            depth_val = row.get(self.depth_col, 0)
            try:
                depth_val = round(float(depth_val), 1)
            except (TypeError, ValueError):
                depth_val = 0.0

            sim_group = row.get("similarity_group", "real")
            results.append({
                "well_name":        wn,
                "formation":        geo.get("formation", "—"),
                "field":            geo.get("field", "—"),
                "country":          geo.get("country", "—"),
                "lat":              geo.get("lat", 0.0),
                "lon":              geo.get("lon", 0.0),
                "risk_type":        rt,
                "depth_m":          depth_val,
                "similarity_group": sim_group,
                "distance_param":   round(d, 1),
            })
        return results


# Singleton
pipeline = DrillingRiskPipeline()
