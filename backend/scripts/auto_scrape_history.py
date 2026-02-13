"""
Automatic web scraper for Timișoara History Timeline
Extracts all timeline events automatically from HTML
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
import json
from pathlib import Path


def scrape_history_timeline():
    """
    Scrape timeline events from visit-timisoara.com history page
    """
    url = "https://visit-timisoara.com/timisoara-a-short-history-timeline/"
    
    print(f"🌐 Fetching {url}...")

    # Robust session with retries and browser-like headers to avoid drops
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
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })

    response = session.get(url, timeout=20)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find all timeline entries (year headers)
    events = []
    
    # Look for h5 tags that contain years
    year_tags = soup.find_all('h5')
    
    for tag in year_tags:
        year_text = tag.get_text(strip=True)
        
        # Check if it's a year (4 digits or date range)
        if year_text.replace('-', '').replace('.', '').replace(' ', '').isdigit():
            year = year_text
            
            # Get the description (next sibling or parent's next sibling)
            description = ""
            
            # Try to find description in next elements
            next_elem = tag.find_next_sibling()
            if next_elem:
                description = next_elem.get_text(strip=True)
            else:
                # Try parent's next sibling
                parent = tag.parent
                if parent:
                    next_parent = parent.find_next_sibling()
                    if next_parent:
                        description = next_parent.get_text(strip=True)
            
            if description and len(description) > 10:  # Filter out empty/short descriptions
                events.append({
                    "year": year,
                    "description": description
                })
                print(f"  ✅ {year}: {description[:60]}...")
    
    print(f"\n📊 Extracted {len(events)} timeline events")
    return events


def create_chunks_from_events(events, chunk_size=3):
    """
    Group events into thematic chunks
    """
    chunks = []
    
    for i in range(0, len(events), chunk_size):
        event_group = events[i:i + chunk_size]
        
        # Create chunk text
        chunk_text = ""
        years = []
        
        for event in event_group:
            chunk_text += f"In {event['year']}, {event['description']} "
            years.append(event['year'])
        
        # Create chunk
        chunk = {
            "heading": f"Timișoara History: {years[0]} - {years[-1]}",
            "text": chunk_text.strip(),
            "years": years,
            "category": "History",
            "source": "Visit Timișoara - History Timeline",
            "url": "https://visit-timisoara.com/timisoara-a-short-history-timeline/",
            "keywords": years + ["history", "timeline", "Timișoara"]
        }
        
        chunks.append(chunk)
        print(f"\n📦 Chunk {len(chunks)}: {chunk['heading']}")
        print(f"   Events: {len(event_group)}")
        print(f"   Length: {len(chunk_text)} chars")
    
    return chunks


def save_to_json(events, chunks, output_dir):
    """Save scraped data to JSON files"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save raw events
    events_file = output_dir / "timisoara_history_events.json"
    with open(events_file, 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved {len(events)} events to {events_file}")
    
    # Save chunks
    chunks_file = output_dir / "timisoara_history_chunks.json"
    with open(chunks_file, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved {len(chunks)} chunks to {chunks_file}")
    
    return events_file, chunks_file


if __name__ == "__main__":
    # Scrape events
    events = scrape_history_timeline()
    
    if not events:
        print("❌ No events found. Check the HTML structure.")
        exit(1)
    
    # Create chunks
    print("\n" + "="*60)
    print("Creating chunks from events...")
    print("="*60)
    chunks = create_chunks_from_events(events, chunk_size=3)
    
    # Save to JSON
    output_dir = Path(__file__).parent.parent / "data"
    save_to_json(events, chunks, output_dir)
    
    print("\n✅ Scraping complete!")
    print(f"📊 Total events: {len(events)}")
    print(f"📊 Total chunks: {len(chunks)}")
    print(f"📊 Average chunk size: {sum(len(c['text']) for c in chunks) // len(chunks)} chars")
