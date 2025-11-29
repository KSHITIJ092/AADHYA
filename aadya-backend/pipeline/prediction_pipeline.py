"""
prediction_pipeline.py
Regional ML pipeline: Multi-City Context → Forecast → Supply → Anomaly → Optimizer → Advisory
"""
import os
import sys
import json
import pandas as pd
import numpy as np
import joblib
from datetime import datetime

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.feature_builder import build_features_for_prediction, save_to_timeseries_store

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

REGIONAL_ADVISORY_JSON = os.path.join(OUTPUT_DIR, 'regional_advisory.json')
PREDICTIONS_LOG = os.path.join(OUTPUT_DIR, 'regional_predictions.csv')

# Forecast features
FORECAST_FEATURES = [
    'tp_lag_1', 'tp_lag_24', 'rolling_3', 'rolling_7',
    'pm25', 'pm25_lag1', 'pm10', 'pm10_lag1', 'no2', 'no2_lag1',
    'aqi', 'temperature_c', 'humidity', 'festival_flag', 'festival_intensity',
    'epidemic_flag', 'days_to_next_festival', 'dow_sin', 'dow_cos',
    'department_le', 'hospital_le'
]


def load_context_snapshot():
    """Load perception context JSON file (multi-city)."""
    path = os.path.join(BASE_DIR, 'context_snapshot.json')
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def run_forecast(df):
    """Forecast patient inflow with confidence intervals."""
    print("\n🔮 Running Forecast Model...")
    model_path = os.path.join(MODELS_DIR, 'forecast_model_lgb.pkl')
    if not os.path.exists(model_path):
        model_path = os.path.join(MODELS_DIR, 'forecast_model_rf.pkl')
    m = joblib.load(model_path)
    model = m['model']

    X = df[FORECAST_FEATURES]
    preds = model.predict(X)
    df['patient_forecast'] = preds
    df['conf_low'] = preds * 0.85
    df['conf_high'] = preds * 1.15
    print(f"✅ Forecast complete for {len(df)} samples.")
    return df


def run_supply_forecast(df):
    """Predict supply usage per city and generate purchase suggestions."""
    print("\n📦 Running Supply Forecasts...")
    supply_items = [
        'oxygen_cylinder', 'paracetamol_tablet', 'iv_fluid_bag',
        'platelet_units', 'antibiotic_injection'
    ]
    results = {}
    for item in supply_items:
        model_path = os.path.join(MODELS_DIR, f'supply_{item}.pkl')
        if not os.path.exists(model_path):
            continue
        model = joblib.load(model_path)['model']
        X = df[['patient_forecast', 'dow']].copy()
        preds = model.predict(X)
        results[item] = float(np.sum(preds))
    print(f"✅ Supply predictions: {results}")
    return results


def run_anomaly_detector(df):
    """Detect anomalies based on forecast + environmental features."""
    print("\n🚨 Detecting Anomalies...")
    model_path = os.path.join(MODELS_DIR, 'iso_anom.pkl')
    m = joblib.load(model_path)
    model = m['model']
    features = m['features']

    anom_features = pd.DataFrame({
        'total_patients': df['patient_forecast'],
        'pm25': df['pm25'],
        'pm25_delta': df['pm25'] - df['pm25_lag1'],
        'ambulance_arrivals': (df['patient_forecast'] * 0.1).astype(int),
        'epidemic_trend_score': df.get('epidemic_trend_score', 0)
    })

    X = anom_features[features]
    is_anomaly = model.predict(X)
    df['is_anomaly'] = (is_anomaly == -1).astype(int)
    total = df['is_anomaly'].sum()

    if total > 0:
        print(f"⚠️  {total} anomalies detected.")
    else:
        print("✅ No anomalies detected.")
    return df, total > 0


def run_staff_optimizer(df):
    """Basic staff optimization."""
    print("\n👥 Running Staff Optimizer...")
    plan = []
    for _, row in df.iterrows():
        forecast = row['patient_forecast']
        city = row.get('city', 'Unknown')
        nurses_needed = int(np.ceil(forecast / 8))
        baseline = 5
        if nurses_needed > baseline:
            plan.append({
                "city": city,
                "extra_nurses": nurses_needed - baseline,
                "reason": f"Forecast {forecast:.0f} patients, need {nurses_needed} nurses"
            })
    if plan:
        print(f"✅ Generated {len(plan)} staffing actions.")
    else:
        print("✅ Staffing stable.")
    return plan


def generate_city_advisory(city, df, supplies, anomalies, staff):
    """Generate structured JSON advisory for a city."""
    total_forecast = float(df['patient_forecast'].sum())
    advisory = {
        "city": city,
        "timestamp": datetime.utcnow().isoformat(),
        "forecast": total_forecast,
        "conf_interval": [
            float(df['conf_low'].sum()),
            float(df['conf_high'].sum())
        ],
        "supplies": supplies,
        "staff_actions": staff,
        "anomalies_detected": anomalies > 0,
        "departments": df[['department', 'patient_forecast', 'is_anomaly']].to_dict('records')
    }
    return advisory


def run_pipeline():
    """Main Regional Prediction Orchestrator."""
    print("\n============================================")
    print("🚀 AADHYA REGIONAL AI PIPELINE (Multi-City)")
    print("============================================\n")

    context = load_context_snapshot()
    cities = context.get("city_data", {}).keys()

    regional_advisory = {"timestamp": datetime.utcnow().isoformat(), "cities": []}

    for city in cities:
        print(f"\n🏙️ Processing {city}...")
        # Build features per city (your builder must read weather + pollution for that city)
        df = build_features_for_prediction(city)
        df = run_forecast(df)
        supplies = run_supply_forecast(df)
        df, anomaly_detected = run_anomaly_detector(df)
        staff_plan = run_staff_optimizer(df)

        advisory = generate_city_advisory(city, df, supplies, anomaly_detected, staff_plan)
        regional_advisory["cities"].append(advisory)

        # Log city-level predictions
        df.to_csv(PREDICTIONS_LOG, mode='a', header=not os.path.exists(PREDICTIONS_LOG), index=False)

        # Save city data to time-series store
        save_to_timeseries_store(df)

    # === Aggregate regional summary ===
    regional_advisory["summary"] = {
        "total_forecast": sum(city["forecast"] for city in regional_advisory["cities"]),
        "total_anomalies": sum(1 for city in regional_advisory["cities"] if city["anomalies_detected"]),
        "high_risk_cities": [
            city["city"] for city in regional_advisory["cities"] if city["anomalies_detected"]
        ]
    }

    # Save final JSON
    with open(REGIONAL_ADVISORY_JSON, "w", encoding="utf-8") as f:
        json.dump(regional_advisory, f, indent=2, ensure_ascii=False)

    print("\n============================================")
    print("✅ REGIONAL PIPELINE COMPLETE")
    print("============================================")
    print(json.dumps(regional_advisory, indent=2, ensure_ascii=False))
    return regional_advisory


if __name__ == "__main__":
    run_pipeline()
