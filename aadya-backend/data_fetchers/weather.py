import requests, os
from dotenv import load_dotenv

load_dotenv()
API_KEY = "53b42cfcc641546abaae9b736cdf340c"

def get_weather(city="Mumbai"):
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    res = requests.get(url)
    data = res.json()

    normalized = {
        "city": city,
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "weather": data["weather"][0]["description"],
        "wind_speed": data["wind"]["speed"]
    }
    return normalized

print(get_weather())