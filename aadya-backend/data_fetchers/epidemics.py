"""
AADYA Epidemic Trend Engine (Modular Version)
Exports functions for perception agent integration:
 - fetch_text()
 - fetch_idsp_bulletin()
 - detect_disease_trends()
 - crawl_all_sources()
"""

import re
import requests
import pdfplumber
import io
from bs4 import BeautifulSoup
import spacy
from datetime import datetime

# -------------------------------------------------------
# Load NLP model
# -------------------------------------------------------
try:
    nlp = spacy.load("en_core_web_sm")
except:
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# -------------------------------------------------------
# CONFIG
# -------------------------------------------------------
DISEASES = [
    "dengue", "malaria", "chikungunya", "influenza", "flu",
    "covid", "covid-19", "measles", "cholera", "japanese encephalitis",
    "swine flu", "sars", "norovirus", "zika", "fever", "nipah"
]

TREND_UP = ["increase","surge","rising","spike","jump","grow","soar","climb","upward","peak"]
TREND_DOWN = ["decrease","decline","drop","fall","reduced","lower","improve","stabilise"]

TIME_KEYWORDS = [
    "last week","past week","recent days","since","past few days",
    "this month","last month","recent weeks","past weeks","currently",
    "right now","as of now","today","in recent times"
]

HEADERS = {"User-Agent": "AADYA-EpidemicCrawler/2.0"}

# -------------------------------------------------------
# GENERIC TEXT FETCHER
# -------------------------------------------------------
def fetch_text(url: str) -> str:
    """Fetch visible text from any webpage."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        for t in soup(["script","style","noscript","header","footer","img","nav"]):
            t.decompose()

        return " ".join(soup.stripped_strings)
    except Exception as e:
        print(f"[ERROR] Fetch failed for: {url} -> {e}")
        return ""


# -------------------------------------------------------
# IDSP BULLETIN PARSER (PDF)
# -------------------------------------------------------
def fetch_idsp_bulletin():
    """Extract official case counts + spikes from IDSP Weekly PDF."""
    try:
        base = "https://idsp.nic.in/"
        home = requests.get(base, headers=HEADERS, timeout=15).text
        soup = BeautifulSoup(home, "html.parser")

        pdf_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].lower()
            if ".pdf" in href and ("weekly" in href or "bulletin" in href):
                pdf_links.append(href)

        if not pdf_links:
            return []

        pdf_url = pdf_links[0] if pdf_links[0].startswith("http") else base + pdf_links[0]
        pdf_bytes = requests.get(pdf_url, headers=HEADERS).content

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            text = "\n".join((p.extract_text() or "") for p in pdf.pages)

        findings = []
        for disease in DISEASES:
            pattern = rf"{disease}[^0-9]{{0,30}}(\d{{1,6}})"
            m = re.search(pattern, text, re.I)
            if m:
                findings.append({
                    "source": "IDSP Bulletin",
                    "disease": disease,
                    "case_count": int(m.group(1)),
                    "trend": "increase" if int(m.group(1)) > 50 else "stable",
                    "location": "India",
                    "snippet": text[text.lower().find(disease): text.lower().find(disease)+180],
                    "timestamp": datetime.utcnow().isoformat()
                })

        return findings
    except Exception as e:
        print("[IDSP ERROR]", e)
        return []


# -------------------------------------------------------
# NLP TREND DETECTOR (GENERAL NEWS)
# -------------------------------------------------------
def detect_disease_trends(text: str, source: str):
    """Detect disease → trend → time → location from general text."""
    if not text:
        return []

    doc = nlp(text)
    text_lower = text.lower()
    findings = []

    for disease in DISEASES:
        if disease in text_lower:
            pattern = rf".{{0,200}}{disease}.{{0,200}}"
            windows = re.findall(pattern, text, flags=re.I)

            for w in windows:
                w_lower = w.lower()

                trend = None
                if any(k in w_lower for k in TREND_UP):
                    trend = "increase"
                elif any(k in w_lower for k in TREND_DOWN):
                    trend = "decrease"

                if not trend:
                    continue

                time_context = next((t for t in TIME_KEYWORDS if t in w_lower), None)
                places = [ent.text for ent in doc.ents if ent.label_ in ["GPE","LOC","ORG"]]
                location = places[0] if places else "Unknown"

                findings.append({
                    "source": source,
                    "disease": disease,
                    "trend": trend,
                    "time_phrase": time_context,
                    "location": location,
                    "context_snippet": w[:200] + "...",
                    "timestamp": datetime.utcnow().isoformat()
                })

    return findings


# -------------------------------------------------------
# MULTI-SOURCE AGGREGATION ENGINE
# -------------------------------------------------------
NEWS_SOURCES = [
    "https://www.who.int/india/news",
    "https://www.mohfw.gov.in/",
    "https://www.indiatoday.in/health",
    "https://timesofindia.indiatimes.com/life-style/health-fitness",
    "https://www.hindustantimes.com/lifestyle/health"
]

def crawl_all_sources():
    """Collects & combines epidemic trend data from all major sources."""
    all_findings = []

    # 1) IDSP bulletin
    idsp_results = fetch_idsp_bulletin()
    if idsp_results:
        all_findings.extend(idsp_results)

    # 2) Health/News websites
    for url in NEWS_SOURCES:
        text = fetch_text(url)
        findings = detect_disease_trends(text, source=url)
        all_findings.extend(findings)

    return all_findings


# -------------------------------------------------------
# Module entrypoint
# -------------------------------------------------------
if __name__ == "__main__":
    print("\n🛡️  AADYA — Epidemic Trend Engine Running...\n")
    results = crawl_all_sources()

    if not results:
        print("❌ No epidemic signals detected.")
    else:
        print("\n🔍 Detected Epidemic / Disease Signals:\n")
        for r in results:
            print(f"🦠 Disease: {r['disease'].title()}")
            print(f"📈 Trend: {r.get('trend', 'N/A').upper()}")
            print(f"📍 Location: {r.get('location')}")
            print(f"🕒 Time context: {r.get('time_phrase')}")
            print(f"🌐 Source: {r['source']}")
            print(f"🔎 Snippet: {r['context_snippet']}")
            print("-" * 90)
