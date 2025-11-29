"""
feature_builder.py
Flattens context_snapshot.json and builds ML-ready features
"""
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTEXT_FILE = os.path.join(BASE_DIR, 'context_snapshot.json')
TS_STORE = os.path.join(BASE_DIR, 'timeseries_store.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

def flatten_context_snapshot(json_path=CONTEXT_FILE):
    """Convert perception JSON to flat features"""
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    timestamp = pd.to_datetime(data['timestamp'])
    sources = data['sources']
    
    # Weather
    weather = sources.get('weather', {})
    temperature_c = weather.get('temperature', 25.0)
    humidity = weather.get('humidity', 60.0)
    
    # Pollution - get latest PM2.5
    pollution = sources.get('pollution', {})
    pm25 = 0.0
    if pollution.get('pollution_data'):
        measurements = pollution['pollution_data'][0].get('measurements', [])
        if measurements:
            pm25 = measurements[-1].get('value', 0.0)
    
    # Derive pm10, no2 (simple heuristic)
    pm10 = pm25 * 1.2
    no2 = 30.0 + np.random.normal(0, 5)
    aqi = int(min(500, pm25 * 1.5))
    
    # Festivals
    festivals = sources.get('festivals', [])
    festival_flag = 1 if festivals else 0
    festival_count = len(festivals)
    
    # Days to next festival
    days_to_next_festival = 999
    if festivals:
        next_date = pd.to_datetime(festivals[0]['date'])
        days_to_next_festival = max(0, (next_date - timestamp).days)
    
    festival_intensity = min(5, len([f for f in festivals if (pd.to_datetime(f['date']) - timestamp).days <= 7]))
    
    # Epidemics
    epidemics = sources.get('epidemics', [])
    epidemic_flag = 1 if epidemics else 0
    epidemic_types = list(set([e['disease'] for e in epidemics]))
    epidemic_trend_score = len([e for e in epidemics if e.get('trend') == 'increase'])
    
    # Temporal features
    date = timestamp.date()
    hour = timestamp.hour
    dow = timestamp.weekday()
    week_of_year = timestamp.isocalendar()[1]
    dow_sin = np.sin(2 * np.pi * dow / 7)
    dow_cos = np.cos(2 * np.pi * dow / 7)
    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)
    
    # City/location
    city = weather.get('city', 'Mumbai')
    population_density = 20000  # default for Mumbai
    
    # Build flat record
    flat = {
        'timestamp': timestamp,
        'date': date,
        'hour': hour,
        'dow': dow,
        'week_of_year': week_of_year,
        'dow_sin': dow_sin,
        'dow_cos': dow_cos,
        'hour_sin': hour_sin,
        'hour_cos': hour_cos,
        'temperature_c': temperature_c,
        'humidity': humidity,
        'pm25': pm25,
        'pm10': pm10,
        'no2': no2,
        'aqi': aqi,
        'festival_flag': festival_flag,
        'festival_count': festival_count,
        'festival_intensity': festival_intensity,
        'days_to_next_festival': days_to_next_festival,
        'epidemic_flag': epidemic_flag,
        'epidemic_types': ','.join(epidemic_types),
        'epidemic_trend_score': epidemic_trend_score,
        'city': city,
        'population_density': population_density,
    }
    
    return flat

def add_lags_and_rolling(flat_record, departments=['Emergency', 'Pulmonology', 'Cardiology', 'ICU', 'Pediatrics', 'General']):
    """Add lag and rolling features from historical time series store"""
    
    # Load time series store if exists
    if os.path.exists(TS_STORE):
        ts_df = pd.read_csv(TS_STORE, parse_dates=['timestamp'])
    else:
        ts_df = pd.DataFrame()
    
    records = []
    for dept in departments:
        rec = flat_record.copy()
        rec['department'] = dept
        rec['hospital_id'] = 'HOSP_MUM_001'
        
        # Compute lags from historical data
        if not ts_df.empty:
            dept_data = ts_df[ts_df['department'] == dept].sort_values('timestamp')
            if len(dept_data) > 0:
                # Lag features
                rec['tp_lag_1'] = dept_data['total_patients'].iloc[-1] if len(dept_data) >= 1 else 0
                rec['tp_lag_24'] = dept_data['total_patients'].iloc[-24] if len(dept_data) >= 24 else rec['tp_lag_1']
                rec['pm25_lag1'] = dept_data['pm25'].iloc[-1] if len(dept_data) >= 1 else rec['pm25']
                rec['pm10_lag1'] = dept_data['pm10'].iloc[-1] if len(dept_data) >= 1 else rec['pm10']
                rec['no2_lag1'] = dept_data['no2'].iloc[-1] if len(dept_data) >= 1 else rec['no2']
                
                # Rolling features
                rec['rolling_3'] = dept_data['total_patients'].tail(3).mean()
                rec['rolling_7'] = dept_data['total_patients'].tail(7).mean()
            else:
                # Defaults
                rec['tp_lag_1'] = 0
                rec['tp_lag_24'] = 0
                rec['pm25_lag1'] = rec['pm25']
                rec['pm10_lag1'] = rec['pm10']
                rec['no2_lag1'] = rec['no2']
                rec['rolling_3'] = 0
                rec['rolling_7'] = 0
        else:
            # First run - use defaults
            rec['tp_lag_1'] = 0
            rec['tp_lag_24'] = 0
            rec['pm25_lag1'] = rec['pm25']
            rec['pm10_lag1'] = rec['pm10']
            rec['no2_lag1'] = rec['no2']
            rec['rolling_3'] = 0
            rec['rolling_7'] = 0
        
        # Placeholder for actual total_patients (will be filled after prediction)
        rec['total_patients'] = 0
        
        records.append(rec)
    
    return pd.DataFrame(records)

def save_to_timeseries_store(df):
    """Append to time series store"""
    if os.path.exists(TS_STORE):
        existing = pd.read_csv(TS_STORE, parse_dates=['timestamp'])
        combined = pd.concat([existing, df], ignore_index=True)
        combined.to_csv(TS_STORE, index=False)
    else:
        df.to_csv(TS_STORE, index=False)
    print(f"✅ Saved {len(df)} records to timeseries_store.csv")

def build_features_for_prediction(json_path=CONTEXT_FILE):
    """Main function: flatten → add lags → return prediction-ready DataFrame"""
    flat = flatten_context_snapshot(json_path)
    df = add_lags_and_rolling(flat)
    
    # Load label encoders
    le_dep = joblib.load(os.path.join(MODELS_DIR, 'labelenc_department.pkl'))
    le_h = joblib.load(os.path.join(MODELS_DIR, 'labelenc_hospital.pkl'))
    
    df['department_le'] = le_dep.transform(df['department'].astype(str))
    df['hospital_le'] = le_h.transform(df['hospital_id'].astype(str))
    
    return df

if __name__ == '__main__':
    # Test
    df = build_features_for_prediction()
    print("Built features:")
    print(df[['timestamp', 'department', 'pm25', 'epidemic_flag', 'festival_flag', 'tp_lag_1', 'rolling_3']].head())
