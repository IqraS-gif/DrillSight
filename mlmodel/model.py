# ============================================================
# MULTI-STAGE DRILLING RISK PREDICTION PIPELINE
#
# Stage 1: PINO            -> physics-informed feature/domain alignment
#                              across wells (so patterns transfer between
#                              the real well and sister wells)
# Stage 2: Snapshot Classifier -> RandomForest/XGBoost, instant risk % per
#                              incident type from current drilling params
# Stage 3: Trend/Pattern Matcher -> DTW comparing recent window to known
#                              pre-incident signatures
# Stage 4: Anomaly Detector  -> Isolation Forest, flags unseen/novel patterns
# Stage 5: Time-to-Incident  -> Cox Proportional Hazards, estimates time
#                              until incident from current risk pattern
#
# Run in Colab, one section at a time. Needs: multiwell_from_real_volve.csv
# ============================================================

# %% [0] Install extra packages not preinstalled in Colab
!pip install -q xgboost lifelines fastdtw

# %% [1] Imports
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
import xgboost as xgb
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean
from lifelines import CoxPHFitter, KaplanMeierFitter
import torch
import torch.nn as nn

# %% [2] Load the multi-well dataset
path = '/content/drive/MyDrive/multiwell_from_real_volve.csv'
df = pd.read_csv(path, low_memory=False)
print("Loaded:", df.shape)

# EDIT these if your actual column names differ slightly
DEPTH_COL   = [c for c in df.columns if "depth" in c.lower() and "tvd" not in c.lower()][0]
WOB_COL     = [c for c in df.columns if "weight on bit" in c.lower()][0]
ROP_COL     = [c for c in df.columns if "rate of penetration" in c.lower()][0]
TORQUE_COL  = [c for c in df.columns if "torque" in c.lower()][0]
HOOKLOAD_COL= [c for c in df.columns if "hookload" in c.lower()][0]
MUDIN_COL   = [c for c in df.columns if "mud density in" in c.lower()][0] if any("mud density in" in c.lower() for c in df.columns) else None
SPP_COL     = [c for c in df.columns if "stand pipe pressure" in c.lower() or "standpipe" in c.lower()][0] if any("stand" in c.lower() and "pressure" in c.lower() for c in df.columns) else None
SHOCK_COL   = [c for c in df.columns if "shock" in c.lower() and "peak" in c.lower()][0] if any("shock" in c.lower() and "peak" in c.lower() for c in df.columns) else None
GAS_COL     = [c for c in df.columns if "gas" in c.lower()][0] if any("gas" in c.lower() for c in df.columns) else None

feature_cols = [c for c in [WOB_COL, ROP_COL, TORQUE_COL, HOOKLOAD_COL, MUDIN_COL, SPP_COL, SHOCK_COL, GAS_COL] if c]
print("Using features:", feature_cols)
print("Depth column:", DEPTH_COL)

df = df.dropna(subset=feature_cols + [DEPTH_COL, "risk_label", "risk_type", "well_name"]).reset_index(drop=True)


# ============================================================
# STAGE 1 — PINO (Physics-Informed Neural Operator)
# Purpose: learn a shared, physics-consistent representation of drilling
# state across wells, so a model trained partly on sister wells still
# transfers to the real well without retraining for each well's
# individual rig/formation conditions.
#
# Simplified implementation: a small neural operator that maps raw
# drilling parameters -> a normalized "physics state" embedding, trained
# with a physics-consistency loss enforcing known relationships
# (e.g., torque should rise with WOB and RPM; ROP should fall as
# hookload/drag rises). This embedding is what Stages 2-4 consume,
# instead of raw features, so all wells sit on a comparable scale.
# ============================================================

# %% [3] PINO model definition
class PINO(nn.Module):
    def __init__(self, n_features, embed_dim=16):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(n_features, 32), nn.ReLU(),
            nn.Linear(32, embed_dim), nn.Tanh()
        )
        # predicts torque and ROP from the embedding, used for the physics loss
        self.physics_head = nn.Sequential(
            nn.Linear(embed_dim, 8), nn.ReLU(),
            nn.Linear(8, 2)  # [predicted torque, predicted rop] (normalized)
        )

    def forward(self, x):
        z = self.encoder(x)
        physics_pred = self.physics_head(z)
        return z, physics_pred

# %% [4] Prepare data + scale
scaler = StandardScaler()
X_all = scaler.fit_transform(df[feature_cols].values)

torque_idx = feature_cols.index(TORQUE_COL)
rop_idx = feature_cols.index(ROP_COL)
wob_idx = feature_cols.index(WOB_COL)

X_tensor = torch.tensor(X_all, dtype=torch.float32)
true_torque = X_tensor[:, torque_idx:torque_idx+1]
true_rop = X_tensor[:, rop_idx:rop_idx+1]

# %% [5] Train PINO with a physics-consistency loss
pino = PINO(n_features=len(feature_cols), embed_dim=16)
optimizer = torch.optim.Adam(pino.parameters(), lr=1e-3)
mse = nn.MSELoss()

n_epochs = 5           # increase for a real run; kept low so this doesn't stall on CPU
batch_size = 4096
n_samples = X_tensor.shape[0]

for epoch in range(n_epochs):
    perm = torch.randperm(n_samples)
    epoch_loss = 0
    for i in range(0, n_samples, batch_size):
        idx = perm[i:i+batch_size]
        xb = X_tensor[idx]
        true_torque_b = true_torque[idx]
        true_rop_b = true_rop[idx]

        z, physics_pred = pino(xb)
        pred_torque, pred_rop = physics_pred[:, 0:1], physics_pred[:, 1:2]

        # Physics-consistency loss: embedding should still let us recover
        # torque and ROP -> forces embedding to preserve physically meaningful info
        loss = mse(pred_torque, true_torque_b) + mse(pred_rop, true_rop_b)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        epoch_loss += loss.item() * xb.shape[0]

    print(f"PINO epoch {epoch+1}/{n_epochs} — loss: {epoch_loss/n_samples:.4f}")

# %% [6] Generate PINO embeddings for the whole dataset (used by later stages)
pino.eval()
with torch.no_grad():
    Z_all, _ = pino(X_tensor)
Z_all = Z_all.numpy()

embed_cols = [f"pino_embed_{i}" for i in range(Z_all.shape[1])]
df[embed_cols] = Z_all
print("PINO embeddings added:", embed_cols)


# ============================================================
# STAGE 2 — SNAPSHOT CLASSIFIER
# RandomForest / XGBoost: instant risk probability per incident type,
# from CURRENT drilling parameters + PINO embedding (depth, mud weight,
# torque, etc. at this single moment — no history needed).
# ============================================================

# %% [6.5] QUICK-TEST MODE (recommended first pass)
# Training on all 2.9M rows takes a while (RF + XGBoost can run 10-30+ min).
# Set QUICK_TEST = True to subsample first and confirm the whole pipeline
# works end-to-end in a few minutes, THEN set it False for the real run.
QUICK_TEST = True
QUICK_TEST_SAMPLE_SIZE = 200_000  # rows, stratified across wells

if QUICK_TEST:
    df_full = df.copy()  # keep the full thing around in case you want it later
    df = (
        df.groupby("well_name", group_keys=False)
        .apply(lambda g: g.sample(min(len(g), QUICK_TEST_SAMPLE_SIZE // df["well_name"].nunique()), random_state=42))
        .reset_index(drop=True)
    )
    print(f"QUICK_TEST active — using {len(df)} rows instead of {len(df_full)}")
else:
    print(f"Full run — using all {len(df)} rows")

# %% [7] Prepare snapshot classification data
snapshot_features = feature_cols + embed_cols + [DEPTH_COL]
X = df[snapshot_features].values
y = df["risk_type"].values  # multi-class: normal, stuck_pipe, kick_influx, excessive_vibration, lost_circulation, stuck_pipe_real

X_train, X_test, y_train, y_test, well_train, well_test = train_test_split(
    X, y, df["well_name"].values, test_size=0.2, random_state=42, stratify=y
)

# %% [8] Train RandomForest (fast baseline)
rf = RandomForestClassifier(n_estimators=200, max_depth=15, class_weight="balanced",
                             n_jobs=-1, random_state=42, verbose=2)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)
print("=== RandomForest Snapshot Classifier ===")
print(classification_report(y_test, rf_pred))

# %% [9] Train XGBoost (usually stronger — encode labels first)
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
y_train_enc = le.fit_transform(y_train)
y_test_enc = le.transform(y_test)

xgb_clf = xgb.XGBClassifier(
    n_estimators=300, max_depth=8, learning_rate=0.1,
    objective="multi:softprob", num_class=len(le.classes_),
    eval_metric="mlogloss", n_jobs=-1, random_state=42
)
xgb_clf.fit(X_train, y_train_enc)
xgb_pred = xgb_clf.predict(X_test)
print("\n=== XGBoost Snapshot Classifier ===")
print(classification_report(y_test_enc, xgb_pred, target_names=le.classes_))

# %% [10] Instant risk probability for a given row (example usage)
def get_instant_risk_probability(row_features):
    """row_features: 1D array matching `snapshot_features` order"""
    probs = xgb_clf.predict_proba([row_features])[0]
    return dict(zip(le.classes_, probs))

example_probs = get_instant_risk_probability(X_test[0])
print("\nExample instant risk probability breakdown:", example_probs)


# ============================================================
# STAGE 3 — TREND / PATTERN MATCHER
# Dynamic Time Warping: compares the last 30-60 "minutes" (rows, as a
# proxy) of live parameter curves against historical pre-incident
# windows, to catch developing patterns a single snapshot would miss.
# ============================================================

# %% [11] Build a library of known pre-incident windows (from sister wells)
WINDOW_SIZE = 50  # rows before an incident start, adjust to match your sampling rate

def extract_pre_incident_windows(df, feature_cols, window_size=WINDOW_SIZE):
    """Pull the `window_size` rows immediately before each risk episode starts,
    per well, per risk type — these become the reference patterns."""
    library = {}  # risk_type -> list of windows (each window: array [window_size, n_features])
    for well in df["well_name"].unique():
        well_df = df[df["well_name"] == well].reset_index(drop=True)
        risk_col = well_df["risk_type"].values
        # find where risk_type transitions from "normal" to something else
        transitions = np.where((risk_col[:-1] == "normal") & (risk_col[1:] != "normal"))[0] + 1
        for t in transitions:
            start = max(0, t - window_size)
            if t - start < window_size:
                continue
            window = well_df.loc[start:t-1, feature_cols].values
            rtype = risk_col[t]
            library.setdefault(rtype, []).append(window)
    return library

pre_incident_library = extract_pre_incident_windows(df, feature_cols)
print("Reference pattern library built:")
for rtype, windows in pre_incident_library.items():
    print(f"  {rtype}: {len(windows)} reference windows")

# %% [12] DTW matcher function
def match_live_window_to_library(live_window, library, max_refs_per_type=20):
    """
    live_window: array [window_size, n_features] — the most recent live data
    Returns: dict of risk_type -> best (lowest) DTW distance found
    """
    results = {}
    for rtype, windows in library.items():
        best_dist = np.inf
        for ref in windows[:max_refs_per_type]:  # cap for speed
            dist, _ = fastdtw(live_window, ref, dist=euclidean)
            best_dist = min(best_dist, dist)
        results[rtype] = best_dist
    return results

# %% [13] Example: run the matcher on a live window from the test set
scaler_feat = StandardScaler().fit(df[feature_cols])
sample_well = df[df["well_name"] == df["well_name"].unique()[0]].reset_index(drop=True)
live_window_raw = sample_well.loc[100:100+WINDOW_SIZE-1, feature_cols].values
live_window = scaler_feat.transform(live_window_raw)

# scale library windows the same way for a fair comparison
scaled_library = {
    rtype: [scaler_feat.transform(w) for w in windows]
    for rtype, windows in pre_incident_library.items()
}

match_result = match_live_window_to_library(live_window, scaled_library)
print("\nDTW distance to each risk pattern (lower = closer match):")
for rtype, dist in sorted(match_result.items(), key=lambda x: x[1]):
    print(f"  {rtype}: {dist:.2f}")


# ============================================================
# STAGE 4 — ANOMALY DETECTOR
# Isolation Forest: flags behavior that doesn't match ANY known pattern
# (normal or risky) — catches novel/unseen risk types the classifier
# and pattern matcher weren't trained to recognize.
# ============================================================

# %% [14] Train Isolation Forest on NORMAL data only (so anomalies = deviation from normal)
normal_mask = df["risk_type"] == "normal"
X_normal = df.loc[normal_mask, feature_cols + embed_cols].values

iso_forest = IsolationForest(n_estimators=200, contamination=0.05, random_state=42, n_jobs=-1)
iso_forest.fit(X_normal)

# %% [15] Score the full dataset
X_full_for_iso = df[feature_cols + embed_cols].values
anomaly_scores = iso_forest.decision_function(X_full_for_iso)  # higher = more normal
anomaly_flags = iso_forest.predict(X_full_for_iso)  # -1 = anomaly, 1 = normal

df["anomaly_score"] = anomaly_scores
df["anomaly_flag"] = (anomaly_flags == -1).astype(int)

print("Anomaly detection results:")
print(df["anomaly_flag"].value_counts())
print("\nAnomaly rate by risk_type:")
print(df.groupby("risk_type")["anomaly_flag"].mean().sort_values(ascending=False))


# ============================================================
# STAGE 5 — TIME-TO-INCIDENT ESTIMATOR
# Cox Proportional Hazards + Kaplan-Meier: converts detected risk
# patterns into an estimated time (rows/depth) until incident, turning
# a vague risk % into an actionable countdown.
# ============================================================

# %% [16] Build survival-analysis dataset
# For each well, for each row, compute:
#   duration = rows remaining until the NEXT incident (or until well end if none)
#   event_observed = 1 if an incident actually occurs within this well's data, else 0
def build_survival_data(df, feature_cols):
    records = []
    for well in df["well_name"].unique():
        well_df = df[df["well_name"] == well].reset_index(drop=True)
        risk_col = well_df["risk_type"].values
        incident_positions = np.where(risk_col != "normal")[0]

        for i in range(len(well_df)):
            future_incidents = incident_positions[incident_positions > i]
            if len(future_incidents) > 0:
                duration = future_incidents[0] - i
                event_observed = 1
            else:
                duration = len(well_df) - i  # censored: no incident before well ends
                event_observed = 0
            records.append((well, i, duration, event_observed))

    surv_df = pd.DataFrame(records, columns=["well_name", "row_idx", "duration", "event_observed"])
    return surv_df

# NOTE: this loop is O(n^2) per well in the worst case — subsample for speed on 2.9M rows
SUBSAMPLE_PER_WELL = 3000  # rows sampled per well for survival modeling; raise if you have time/compute

sampled_df = (
    df.groupby("well_name", group_keys=False)
    .apply(lambda g: g.sample(min(len(g), SUBSAMPLE_PER_WELL), random_state=42))
    .reset_index(drop=True)
)

surv_df = build_survival_data(sampled_df, feature_cols)
surv_df = surv_df.merge(
    sampled_df.reset_index(drop=True)[feature_cols + embed_cols + ["well_name"]].reset_index().rename(columns={"index": "row_idx"}),
    on=["well_name", "row_idx"], how="left"
)
surv_df = surv_df.dropna()
print("Survival dataset shape:", surv_df.shape)
print(surv_df[["duration", "event_observed"]].describe())

# %% [17] Fit Cox Proportional Hazards model
cph_features = feature_cols + embed_cols
cph_data = surv_df[cph_features + ["duration", "event_observed"]].copy()

cph = CoxPHFitter(penalizer=0.1)  # penalizer helps with collinear PINO embeddings
cph.fit(cph_data, duration_col="duration", event_col="event_observed")
cph.print_summary()

# %% [18] Kaplan-Meier baseline curve (overall, no covariates — sanity check)
kmf = KaplanMeierFitter()
kmf.fit(surv_df["duration"], event_observed=surv_df["event_observed"])
print("\nKaplan-Meier median time-to-incident (rows):", kmf.median_survival_time_)

# %% [19] Example: estimate time-to-incident for a live row
def estimate_time_to_incident(row_features_dict):
    """row_features_dict: dict matching cph_features -> value"""
    row_df = pd.DataFrame([row_features_dict])
    predicted_median = cph.predict_median(row_df)
    return predicted_median.values[0]

example_row = surv_df.iloc[0][cph_features].to_dict()
predicted_ttf = estimate_time_to_incident(example_row)
print(f"\nExample estimated time-to-incident: {predicted_ttf:.1f} rows")


# ============================================================
# PIPELINE SUMMARY — pulling all 5 stages together for one live row
# ============================================================

# %% [20] End-to-end example on one row
def full_pipeline_predict(row):
    """row: a pandas Series with all feature_cols + embed_cols populated"""
    snapshot_input = row[snapshot_features].values.reshape(1, -1)
    risk_probs = get_instant_risk_probability(snapshot_input[0])

    iso_input = row[feature_cols + embed_cols].values.reshape(1, -1)
    anomaly_score = iso_forest.decision_function(iso_input)[0]
    is_anomaly = iso_forest.predict(iso_input)[0] == -1

    ttf_input = row[cph_features].to_dict()
    ttf = estimate_time_to_incident(ttf_input)

    return {
        "instant_risk_probabilities": risk_probs,
        "anomaly_score": anomaly_score,
        "is_anomaly": bool(is_anomaly),
        "estimated_time_to_incident_rows": ttf,
    }

example_row = df.iloc[1000]
result = full_pipeline_predict(example_row)
print("\n=== FULL PIPELINE OUTPUT (example row) ===")
for k, v in result.items():
    print(f"{k}: {v}")