"""
Automatic scraper for https://visit-timisoara.com/timisoara-landmarks/
Extracts landmark sections (heading + paragraphs) into RAG-ready chunks.
"""

import json
import re
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup

URL = "https://visit-timisoara.com/timisoara-landmarks/"
LANDMARK_TITLES = [
    "Victoriei Square",
    "Palace of Culture",
    "Libertății Square",
    "Synagogue in the Fortress",
    "Unirii Square",
    "Maria Theresa Bastion",
]


def fetch_html(url: str) -> str:
    session = requests.Session()
    retries = Retry(total=5, backoff_factor=1.0, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["GET"])
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })
    resp = session.get(url, timeout=20)
    resp.raise_for_status()
    return resp.text


def extract_sections(html: str):
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup

    heading_tags = ["h2", "h3", "h4", "h5", "h6"]
    stop_words = [
        "follow", "about", "newsletter", "city hall", "tourist info", "additional links",
        "proud member", "terms", "privacy", "transparency"
    ]

    def is_noise(text: str) -> bool:
        t = text.lower()
        if any(x in t for x in stop_words):
            return True
        if "data:image" in t or "svg+xml" in t:
            return True
        return False

    sections = []

    # Capture hero/intro paragraphs before the first heading
    intro_texts = []
    first_heading = main.find(heading_tags)
    for elem in main.children:
        if elem == first_heading:
            break
        if getattr(elem, "name", None) in ["p", "div"]:
            text = elem.get_text(strip=True)
            if text and len(text) > 60 and not is_noise(text):
                intro_texts.append(text)
    if intro_texts:
        sections.append({
            "heading": "Heritage Landmarks Overview",
            "text": " ".join(intro_texts),
            "category": "Landmarks",
            "source": "Visit Timișoara - Landmarks",
            "url": URL,
            "keywords": ["landmark", "heritage", "Timisoara", "overview"],
        })

    for heading in main.find_all(heading_tags):
        title = heading.get_text(strip=True)
        if not title:
            continue
        if any(x in title.lower() for x in stop_words):
            continue

        texts = []
        for sibling in heading.find_next_siblings():
            if sibling.name in heading_tags:
                break
            if sibling.name in ["p", "div", "li"]:
                text = sibling.get_text(strip=True)
                if text and len(text) > 40:
                    if is_noise(text):
                        continue
                    texts.append(text)
        if not texts:
            continue

        body = " ".join(texts)
        sections.append({
            "heading": title,
            "text": body,
            "category": "Landmarks",
            "source": "Visit Timișoara - Landmarks",
            "url": URL,
            "keywords": ["landmark", "heritage", "Timisoara", title]
        })

    # Ensure key landmarks are captured even if HTML structure is irregular
    required_titles = [
        "Victoriei Square",
        "Palace of Culture",
        "Libertății Square",
        "Synagogue in the Fortress",
        "Unirii Square",
        "Maria Theresa Bastion",
    ]

    existing = {s["heading"] for s in sections}

    def grab_from_match(title: str):
        # Find any tag containing the title text
        match = main.find(string=re.compile(re.escape(title), re.IGNORECASE))
        if not match:
            return None
        node = match.parent
        texts = []
        # gather forward until next heading
        for sibling in node.find_next_siblings():
            if getattr(sibling, "name", None) in heading_tags:
                break
            if sibling.name in ["p", "div", "li"]:
                text = sibling.get_text(strip=True)
                if text and len(text) > 40 and not is_noise(text):
                    texts.append(text)
        if texts:
            body = " ".join(texts)
            return {
                "heading": title,
                "text": body,
                "category": "Landmarks",
                "source": "Visit Timișoara - Landmarks",
                "url": URL,
                "keywords": ["landmark", "heritage", "Timisoara", title],
            }
        return None

    for title in required_titles:
        if title not in existing:
            chunk = grab_from_match(title)
            if chunk:
                sections.append(chunk)

    # If some still missing, attempt regex split on main text
    missing = [t for t in LANDMARK_TITLES if t not in {s["heading"] for s in sections}]
    if missing:
        full_text = main.get_text(" ", strip=True)
        pattern = r"(" + "|".join(re.escape(t) for t in LANDMARK_TITLES) + r")"
        parts = re.split(pattern, full_text)
        # parts like ['', title, text, title, text ...]
        for i in range(1, len(parts), 2):
            title = parts[i].strip()
            body = parts[i + 1].strip() if i + 1 < len(parts) else ""
            if not body:
                continue
            if title in {s["heading"] for s in sections}:
                continue
            # trim to reasonable length
            if len(body) > 1400:
                body = body[:1400]
            sections.append({
                "heading": title,
                "text": body,
                "category": "Landmarks",
                "source": "Visit Timișoara - Landmarks",
                "url": URL,
                "keywords": ["landmark", "heritage", "Timisoara", title],
            })
    return sections


def save_json(data, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    print(f"🌐 Fetching {URL}...")
    html = fetch_html(URL)
    sections = extract_sections(html)
    print(f"📑 Extracted {len(sections)} landmark sections")

    out_dir = Path(__file__).parent.parent / "data"
    save_json(sections, out_dir / "timisoara_landmarks_chunks.json")

    if sections:
        avg = sum(len(s["text"]) for s in sections) // len(sections)
    else:
        avg = 0
    print(f"📊 Average chunk size: {avg} chars")

    for i, s in enumerate(sections, 1):
        print(f"\n{i}. {s['heading']}")
        print(f"   Len: {len(s['text'])} chars")


if __name__ == "__main__":
    main()
