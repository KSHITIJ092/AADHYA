# backend/main.py
# 100 lines - FastAPI backend for AADYA Admin Dashboard
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime, timedelta
import random, uvicorn, asyncio, os, csv, json

app = FastAPI(title="AADYA Admin API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory store for demo (replace with DB in prod)
STATE = {"last_update": None, "insights": [], "features": [], "actions": []}

# Models
class Insight(BaseModel):
    timestamp: str
    area_id: str
    area_name: str
    pm25: float
    surge_risk: int
    expected_patients_hr: int
    oxygen_extra: int

class ActionRequest(BaseModel):
    area_id: str
    action_type: str
    details: Dict[str, Any]

# Utilities - synthetic realistic generator
AREAS = [
    {"area_id":"MUM_CITY","area_name":"Mumbai City"},
    {"area_id":"MUM_BANDRA","area_name":"Bandra"},
    {"area_id":"NAVI_VASHI","area_name":"Navi Vashi"},
    {"area_id":"KDMC_KALYAN","area_name":"Kalyan"},
    {"area_id":"THANE","area_name":"Thane"}
]

def gen_insight_row(area):
    now = datetime.utcnow().isoformat()+"Z"
    pm25 = round(random.uniform(30,350),1)
    surge = min(100, int((pm25/300)*80 + random.randint(-5,10)))
    expected = int(round(30*(1+surge/100.0)))
    oxygen = max(0, int((expected-30)/10))
    return {
        "timestamp": now,
        "area_id": area["area_id"],
        "area_name": area["area_name"],
        "pm25": pm25,
        "surge_risk": surge,
        "expected_patients_hr": expected,
        "oxygen_extra": oxygen
    }

async def refresh_state_periodically(interval=30):
    while True:
        STATE["insights"] = [gen_insight_row(a) for a in AREAS]
        STATE["features"] = [{"area_id":r["area_id"], "pm25":r["pm25"], "temp": round(random.uniform(24,33),1)} for r in STATE["insights"]]
        STATE["last_update"] = datetime.utcnow().isoformat()+"Z"
        await asyncio.sleep(interval)

@app.on_event("startup")
async def startup_event():
    # warm initial state
    STATE["insights"] = [gen_insight_row(a) for a in AREAS]
    STATE["features"] = [{"area_id":r["area_id"], "pm25":r["pm25"], "temp": round(random.uniform(24,33),1)} for r in STATE["insights"]]
    STATE["last_update"] = datetime.utcnow().isoformat()+"Z"
    # background refresher
    loop = asyncio.get_event_loop()
    loop.create_task(refresh_state_periodically())

# Endpoints
@app.get("/api/health")
def health():
    return {"status":"ok","now": datetime.utcnow().isoformat()+"Z"}

@app.get("/api/insights", response_model=List[Insight])
def get_insights():
    return STATE["insights"]

@app.get("/api/features")
def get_features():
    return {"last_update": STATE["last_update"], "features": STATE["features"]}

@app.post("/api/action")
def post_action(req: ActionRequest):
    row = {"id": len(STATE["actions"])+1, "timestamp": datetime.utcnow().isoformat()+"Z", "request": req.dict()}
    STATE["actions"].append(row)
    # Simulate immediate effect: reduce surge slightly for area
    for r in STATE["insights"]:
        if r["area_id"] == req.area_id:
            r["surge_risk"] = max(0, r["surge_risk"] - 8)
            r["expected_patients_hr"] = max(10, int(r["expected_patients_hr"]*0.92))
    return {"status":"accepted","action_id": row["id"]}

@app.get("/api/actions")
def list_actions():
    return {"actions": STATE["actions"]}

@app.post("/api/simulate/{area_id}")
def simulate_area(area_id: str):
    found = False
    for a in AREAS:
        if a["area_id"] == area_id:
            found = True; break
    if not found:
        raise HTTPException(status_code=404, detail="area not found")
    # bump PM2.5 artificially
    for r in STATE["insights"]:
        if r["area_id"] == area_id:
            r["pm25"] = min(500, r["pm25"] + random.uniform(50,120))
            r["surge_risk"] = min(100, r["surge_risk"] + random.randint(15,40))
            r["expected_patients_hr"] = int(round(30*(1+r["surge_risk"]/100.0)))
    return {"status":"simulated","area_id": area_id}

# Quick CSV export for demo
@app.get("/api/export/csv")
def export_csv():
    path = "insights_export.csv"
    keys = ["timestamp","area_id","area_name","pm25","surge_risk","expected_patients_hr","oxygen_extra"]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for r in STATE["insights"]:
            writer.writerow({k: r.get(k) for k in keys})
    return {"csv": os.path.abspath(path)}

# Run if executed directly
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
