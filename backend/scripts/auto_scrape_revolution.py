"""
Automatic scraper for https://visit-timisoara.com/timisoara-revolution-89/
Builds RAG-ready chunks using BeautifulSoup with retries and browser headers.
"""

import json
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup


def fetch_page(url: str) -> str:
    """Fetch HTML with retries and friendly headers."""
    session = requests.Session()
    retries = Retry(
        total=5,
        backoff_factor=1.0,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    resp = session.get(url, timeout=20)
    resp.raise_for_status()
    return resp.text


def extract_paragraphs(html: str) -> list[str]:
    """Extract main paragraph texts from the Revolution page."""
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup
    paragraphs = []
    for p in main.find_all("p"):
        text = p.get_text(strip=True)
        if not text:
            continue
        # Filter out footer/social fluff
        if any(x in text.lower() for x in ["facebook", "instagram", "youtube", "tiktok", "newsletter", "©", "terms"]):
            continue
        if len(text) < 40:
            continue
        paragraphs.append(text)
    return paragraphs


def build_chunks(paragraphs: list[str], max_chars: int = 550) -> list[dict]:
    """Group paragraphs into self-contained chunks for RAG."""
    chunks = []
    current = []
    current_len = 0
    for para in paragraphs:
        if current_len + len(para) + 1 > max_chars and current:
            chunks.append(" ".join(current))
            current = []
            current_len = 0
        current.append(para)
        current_len += len(para) + 1
    if current:
        chunks.append(" ".join(current))

    result = []
    for idx, text in enumerate(chunks, 1):
        result.append(
            {
                "heading": f"Revolution '89 – Segment {idx}",
                "text": text,
                "category": "History",
                "period": "1989 Revolution",
                "source": "Visit Timișoara - Revolution '89",
                "url": "https://visit-timisoara.com/timisoara-revolution-89/",
                "keywords": ["1989", "revolution", "Timișoara", "freedom", "memorial", "museum"],
            }
        )
    return result


def save_json(data, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    url = "https://visit-timisoara.com/timisoara-revolution-89/"
    print(f"🌐 Fetching {url}...")
    html = fetch_page(url)

    paragraphs = extract_paragraphs(html)
    print(f"📑 Extracted {len(paragraphs)} paragraphs")

    chunks = build_chunks(paragraphs)
    print(f"📦 Built {len(chunks)} chunks (avg ~{sum(len(c['text']) for c in chunks)//len(chunks) if chunks else 0} chars)")

    out_dir = Path(__file__).parent.parent / "data"
    save_json(paragraphs, out_dir / "timisoara_revolution_paragraphs.json")
    save_json(chunks, out_dir / "timisoara_revolution_chunks.json")

    for i, c in enumerate(chunks, 1):
        print(f"\n{i}. {c['heading']}")
        print(f"   Len: {len(c['text'])} chars")


if __name__ == "__main__":
    main()
