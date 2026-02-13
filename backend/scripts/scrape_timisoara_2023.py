"""
Scrape Timișoara 2023 (European Capital of Culture) page
https://visit-timisoara.com/timisoara-2023/
"""
import requests
from bs4 import BeautifulSoup
import json
import os
from pathlib import Path
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

# Setup retry logic
session = requests.Session()
retry = Retry(connect=3, backoff_factor=0.5)
adapter = HTTPAdapter(max_retries=retry)
session.mount("http://", adapter)
session.mount("https://", adapter)

url = "https://visit-timisoara.com/timisoara-2023/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

try:
    print(f"🔗 Fetching {url}...")
    response = session.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, "html.parser")
    
    chunks = []
    
    # Extract main sections
    sections_to_extract = []
    
    # Find all text editor widgets containing the main content
    text_editors = soup.find_all("div", class_="elementor-widget-text-editor")
    
    for editor in text_editors:
        content = editor.get_text(strip=True)
        if content and len(content) > 50:
            sections_to_extract.append(content)
    
    # Extract headings and their content
    headings = soup.find_all(['h2', 'h3', 'h4'])
    for heading in headings:
        heading_text = heading.get_text(strip=True)
        if heading_text and any(keyword in heading_text.lower() for keyword in ['timisoara', 'culture', 'light', 'shine']):
            # Get the next paragraph or content after heading
            next_elem = heading.find_next(['p', 'div'])
            if next_elem:
                para_text = next_elem.get_text(strip=True)
                if para_text and len(para_text) > 50:
                    sections_to_extract.append(f"{heading_text}\n{para_text}")
    
    # Create chunks from extracted content
    for i, section in enumerate(sections_to_extract):
        # Clean up whitespace
        section = " ".join(section.split())
        
        if len(section) > 100:
            chunk = {
                "text": section[:2000],  # Keep reasonable size
                "heading": section[:100],
                "category": "Timișoara 2023",
                "period": "2023",
                "source": "Visit Timișoara - European Capital of Culture",
                "url": url
            }
            chunks.append(chunk)
            print(f"✅ Extracted chunk {i+1}: {chunk['heading'][:60]}...")
    
    # Save to JSON
    os.makedirs("backend/data", exist_ok=True)
    output_file = "backend/data/timisoara_2023_chunks.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    
    print(f"\n[SUCCESS] Scraped {len(chunks)} chunks!")
    print(f"Saved to {output_file}")
    
    # Print summary
    total_chars = sum(len(chunk["text"]) for chunk in chunks)
    print(f"\nTotal content: {len(chunks)} chunks, {total_chars} characters")
    
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
