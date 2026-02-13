"""
Scrape Timișoara Firsts page and extract achievements
https://visit-timisoara.com/firsts/
"""
import requests
from bs4 import BeautifulSoup
import json
import os
import re
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

# Setup retry logic
session = requests.Session()
retry = Retry(connect=3, backoff_factor=0.5)
adapter = HTTPAdapter(max_retries=retry)
session.mount("http://", adapter)
session.mount("https://", adapter)

url = "https://visit-timisoara.com/firsts/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

try:
    response = session.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, "html.parser")
    
    firsts = []
    
    # Parse HTML structure: find all first items (typically in divs with title and content)
    # Strategy 1: Look for heading tags (h2, h3, h4) that start with "First"/"The First"
    headings = soup.find_all(['h2', 'h3', 'h4'])
    heading_texts = []
    for heading in headings:
        text = heading.get_text(strip=True)
        if text and any(text.lower().startswith(prefix) for prefix in ['first', 'the first']):
            heading_texts.append(text)
    
    print(f"Found {len(heading_texts)} potential firsts via headings")
    
    # Strategy 2: Parse all text and split by title patterns
    main = soup.find("main") or soup.find("body")
    if not main:
        main = soup
    
    all_text = main.get_text("\n")
    
    # More accurate extraction: look for title followed by description
    # Pattern: "Title" followed by non-empty description until next title
    title_patterns = [
        "First city in the country with a beer factory",
        "The First City Free from Communism in Romania",
        "First European city with fully electrically illuminated streets",
        "The first machine for welding railway and tram rails",
        "First city with an ambulance station in Romania and Hungary",
        "First concert outside Vienna by Johann Strauss II",
        "First European city with three state theaters in three different languages",
        "First social project involving the community in solving social problems in Romania",
        "The first alphanumeric Romanian computer",
        "The first city in Romania to use ether as an anesthetic"
    ]
    
    for title in title_patterns:
        # Search for the title in the text
        title_lower = title.lower()
        text_lower = all_text.lower()
        
        if title_lower in text_lower:
            # Find the position and extract content after title
            idx = text_lower.find(title_lower)
            start_pos = idx + len(title)
            
            # Get text after title until next potential title
            remaining = all_text[start_pos:]
            
            # Split by the next title pattern or by double newline
            next_title_idx = float('inf')
            for other_title in title_patterns:
                if other_title.lower() != title_lower:
                    idx_other = remaining.lower().find(other_title.lower())
                    if idx_other != -1 and idx_other < next_title_idx:
                        next_title_idx = idx_other
            
            if next_title_idx == float('inf'):
                content = remaining
            else:
                content = remaining[:next_title_idx]
            
            # Clean up content: remove extra whitespace
            content = content.strip()
            content = re.sub(r'\s+', ' ', content)
            
            if len(content) > 50:
                first_item = {
                    "title": title,
                    "content": content,
                    "source": "Visit Timisoara - Firsts"
                }
                firsts.append(first_item)
                print(f"[OK] {title[:50]}")
            else:
                print(f"[INCOMPLETE] {title[:50]} - only {len(content)} chars")
        else:
            print(f"[MISSING] {title[:50]}")
    
    # Save to JSON with absolute path
    os.makedirs("backend/data", exist_ok=True)
    output_file = "backend/data/timisoara_firsts.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(firsts, f, ensure_ascii=False, indent=2)
    
    print(f"\n[SUCCESS] Scraped {len(firsts)} firsts!")
    print(f"Saved to {output_file}")
    
    # Print content of JSON for verification
    print("\nContents:")
    for item in firsts:
        print(f"  - {item['title'][:60]}: {len(item['content'])} chars")
    
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()


