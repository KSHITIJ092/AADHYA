import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any

# ⚠️ Make sure to keep your API key secure (move to environment variable in production)
GOOGLE_API_KEY = "AIzaSyDmDm6x4457zzPoz362Dnyf-oRmtXr23Gw"

def get_festivals(days_ahead: int = 90) -> List[Dict[str, Any]]:
    """
    Fetch upcoming Indian holidays and festivals from Google Calendar API.
    
    Args:
        days_ahead (int): Number of days ahead to fetch events for.
    
    Returns:
        List of festival events with name, date, and optional description.
    """
    calendar_id = "en.indian%23holiday@group.v.calendar.google.com"
    
    now = datetime.utcnow().isoformat() + "Z"
    later = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat() + "Z"
    
    url = (
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
        f"?key={GOOGLE_API_KEY}"
        f"&timeMin={now}&timeMax={later}"
        f"&maxResults=50&orderBy=startTime&singleEvents=true"
    )

    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print(f"[Festival API Error] {e}")
        return []

    data = res.json()
    events = []
    for ev in data.get("items", []):
        events.append({
            "name": ev.get("summary"),
            "date": ev.get("start", {}).get("date"),
            "description": ev.get("description", ""),
            "source": "Google Calendar (Indian Holidays)"
        })

    return events


# 🧠 Example usage (if run directly)
if __name__ == "__main__":
    festivals = get_festivals()
    print("\n📅 Upcoming Indian Festivals / Holidays:\n")
    for f in festivals:
        print(f"- {f['name']} ({f['date']})")
