import requests
import os
from datetime import datetime
from dotenv import load_dotenv
# from database.db_config import save_data  # your existing DB saving helper

# Load environment variables
load_dotenv()
OPENAQ_KEY = "086c8ba8b0bbf910a2e1f6f088e29dee249923aa0f7b3e6563161127fbba1d1b"

# Base URL for OpenAQ v3 API
BASE_URL = "https://api.openaq.org/v3/"

def api_get(endpoint: str, params=None):
    headers = {
        "accept": "application/json",
        "X-API-Key": OPENAQ_KEY
    }
    try:
        res = requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params, timeout=10)
        res.raise_for_status()
        return res.json()
    except requests.exceptions.RequestException as e:
        print(f"⚠️  OpenAQ request failed for {endpoint}: {e}")
        return None


# --- Step 1: Get Sensors for a Location ---
def get_sensors_for_location(location_id: int):
    data = api_get(f"/locations/{location_id}")
    if not data or "results" not in data or not data["results"]:
        return []

    sensors = data["results"][0].get("sensors", [])
    sensor_list = [{"id": s["id"], "parameter": s["parameter"]["name"]} for s in sensors]
    return sensor_list


# --- Step 2: Get Measurements for a Sensor ---
def get_sensor_measurements(sensor_id: int, period: str = "measurements", limit: int = 5):
    """
    period can be one of:
    'measurements' (raw)
    'hours' (hourly averages)
    'days' (daily averages)
    'years' (yearly averages)
    """
    endpoint = f"/sensors/{sensor_id}/{period}"
    params = {"limit": limit}
    data = api_get(endpoint, params)

    if not data or "results" not in data:
        return []

    measurements = []
    for m in data["results"]:
        measurements.append({
            "parameter": m.get("parameter", {}).get("name"),
            "value": m.get("value"),
            "unit": m.get("parameter", {}).get("units"),
            "datetime_from": m.get("period", {}).get("datetimeFrom", {}).get("local"),
            "datetime_to": m.get("period", {}).get("datetimeTo", {}).get("local"),
            "summary": m.get("summary"),
            "coverage": m.get("coverage")
        })
    return measurements


# --- Step 3: Combine Everything for a Location ---
def get_pollution_data(location_id: int = 8118, period: str = "measurements"):
    sensors = get_sensors_for_location(location_id)
    if not sensors:
        print("⚠️  No sensors found for this location.")
        return {"status": "no_sensors", "timestamp": datetime.now().isoformat()}

    pollution_data = []
    for sensor in sensors:
        sensor_id = sensor["id"]
        param = sensor["parameter"]
        print(f"🔍 Fetching {period} data for sensor {sensor_id} ({param})...")
        sensor_measurements = get_sensor_measurements(sensor_id, period)
        pollution_data.append({
            "sensor_id": sensor_id,
            "parameter": param,
            "measurements": sensor_measurements
        })

    data = {
        "location_id": location_id,
        "period": period,
        "pollution_data": pollution_data,
        "timestamp": datetime.now().isoformat(),
        "status": "ok"
    }

    # Save to DB
    # save_data("pollution", data)
    print(f"✅ Pollution data saved for location {location_id} ({period})")
    return data


if __name__ == "__main__":
    # Try different aggregation levels:
    result = get_pollution_data(8118, period="hours")   # hourly average
    print("\nFetched Data Summary:\n", result)
