"""
Scrape Timișoara Wikipedia pages (English & Romanian) and extract structured knowledge.
Outputs JSON documents ready for embedding and vector storage.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
from pathlib import Path

# Configuration
WIKI_EN_URL = "https://en.wikipedia.org/wiki/Timi%C8%99oara"
WIKI_RO_URL = "https://ro.wikipedia.org/wiki/Timi%C8%99oara"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "documents"
OUTPUT_FILE = OUTPUT_DIR / "timisoara_wikipedia.json"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}


def extract_section_with_headings(soup):
    """
    Extract all sections with headings from Wikipedia article.
    Returns list of {heading, paragraphs, level}
    """
    sections = []
    current_section = None
    current_level = 0

    content_div = soup.find('div', id='mw-content-text')
    if not content_div:
        return sections

    # Process all elements in order
    for elem in content_div.find_all(['h2', 'h3', 'h4', 'p', 'ul']):
        if elem.name.startswith('h'):
            level = int(elem.name[1])
            heading_text = elem.get_text(strip=True)

            # Skip edit spans and refs
            heading_span = elem.find('span', class_='mw-headline')
            if heading_span:
                heading_text = heading_span.get_text(strip=True)

            # Create new section
            if current_section:
                sections.append(current_section)

            current_section = {
                'heading': heading_text,
                'level': level,
                'paragraphs': [],
                'lists': []
            }
            current_level = level

        elif elem.name == 'p' and current_section:
            text = elem.get_text(strip=True)
            if text and len(text) > 30:  # Filter very short paragraphs
                current_section['paragraphs'].append(text)

        elif elem.name == 'ul' and current_section:
            # Extract list items
            items = [li.get_text(strip=True) for li in elem.find_all('li')]
            if items:
                current_section['lists'].append(items)

    # Add last section
    if current_section:
        sections.append(current_section)

    return sections


def scrape_wikipedia(url, language='en'):
    """
    Scrape a Wikipedia page and return structured sections.
    """
    print(f"Fetching {language.upper()} Wikipedia page...")
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return []

    soup = BeautifulSoup(response.content, 'html.parser')

    # Get title
    title_elem = soup.find('h1', class_='firstHeading')
    title = title_elem.get_text(strip=True) if title_elem else 'Timișoara'

    # Extract all sections
    sections = extract_section_with_headings(soup)
    print(f"  Extracted {len(sections)} sections")

    return {
        'title': title,
        'url': url,
        'language': language,
        'sections': sections
    }


def flatten_sections_to_docs(scraped_data):
    """
    Convert scraped sections into flattened documents for embedding.
    Each section becomes a document with metadata.
    """
    docs = []
    language = scraped_data['language']
    source_url = scraped_data['url']

    section_idx = 0
    for section in scraped_data['sections']:
        heading = section['heading']
        paragraphs = section['paragraphs']
        lists = section['lists']

        # Combine paragraphs + list items into single text
        text_parts = paragraphs.copy()

        for list_items in lists:
            text_parts.append(" • " + " • ".join(list_items))

        combined_text = "\n".join(text_parts)

        if combined_text.strip():
            doc = {
                'id': f'wiki-{language}-timisoara-{section_idx}',
                'text': combined_text,
                'heading': heading,
                'source': f'Wikipedia ({language.upper()})',
                'source_url': source_url,
                'type': 'general_info',
                'language': language,
                'level': section['level']
            }
            docs.append(doc)
            section_idx += 1

    return docs


def chunk_long_documents(docs, chunk_size=500, overlap=50):
    """
    Further chunk long documents into smaller pieces for better embedding.
    chunk_size: approx words per chunk
    overlap: words to overlap between chunks
    """
    chunked = []

    for doc in docs:
        text = doc['text']
        words = text.split()

        if len(words) <= chunk_size:
            chunked.append(doc)
        else:
            # Chunk with overlap
            chunk_idx = 0
            for i in range(0, len(words), chunk_size - overlap):
                chunk_words = words[i : i + chunk_size]
                chunk_text = " ".join(chunk_words)

                chunk_doc = doc.copy()
                chunk_doc['id'] = f"{doc['id']}_chunk{chunk_idx}"
                chunk_doc['text'] = chunk_text
                chunk_doc['chunk_index'] = chunk_idx
                chunked.append(chunk_doc)
                chunk_idx += 1

    return chunked


def save_documents(docs, output_file):
    """Save documents to JSON file."""
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(docs, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(docs)} documents to {output_file}")


def main():
    print("=" * 60)
    print("TIMIȘOARA WIKIPEDIA SCRAPER")
    print("=" * 60)

    all_docs = []

    # Scrape English Wikipedia
    print("\n1. SCRAPING ENGLISH WIKIPEDIA")
    print("-" * 60)
    en_data = scrape_wikipedia(WIKI_EN_URL, language='en')
    if en_data:
        en_docs = flatten_sections_to_docs(en_data)
        all_docs.extend(en_docs)
        print(f"  Generated {len(en_docs)} documents from EN sections")
    time.sleep(1)  # Polite delay

    # Scrape Romanian Wikipedia
    print("\n2. SCRAPING ROMANIAN WIKIPEDIA")
    print("-" * 60)
    ro_data = scrape_wikipedia(WIKI_RO_URL, language='ro')
    if ro_data:
        ro_docs = flatten_sections_to_docs(ro_data)
        all_docs.extend(ro_docs)
        print(f"  Generated {len(ro_docs)} documents from RO sections")
    time.sleep(1)

    # Chunk long documents
    print("\n3. CHUNKING LONG DOCUMENTS")
    print("-" * 60)
    print(f"  Before chunking: {len(all_docs)} documents")
    all_docs = chunk_long_documents(all_docs, chunk_size=500, overlap=50)
    print(f"  After chunking: {len(all_docs)} documents")

    # Save
    print("\n4. SAVING")
    print("-" * 60)
    save_documents(all_docs, OUTPUT_FILE)

    # Summary
    print("\n5. SUMMARY")
    print("-" * 60)
    en_count = len([d for d in all_docs if d['language'] == 'en'])
    ro_count = len([d for d in all_docs if d['language'] == 'ro'])
    print(f"  Total documents: {len(all_docs)}")
    print(f"  English: {en_count}")
    print(f"  Romanian: {ro_count}")

    # Show sample
    if all_docs:
        print("\n6. SAMPLE DOCUMENT")
        print("-" * 60)
        sample = all_docs[0]
        print(f"  ID: {sample['id']}")
        print(f"  Heading: {sample['heading']}")
        print(f"  Language: {sample['language']}")
        print(f"  Text preview: {sample['text'][:200]}...")

    print("\n" + "=" * 60)
    print("✓ DONE")
    print("=" * 60)


if __name__ == '__main__':
    main()
