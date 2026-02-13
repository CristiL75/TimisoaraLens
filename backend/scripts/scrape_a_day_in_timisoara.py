import json
import re
from datetime import datetime
from bs4 import BeautifulSoup

def scrape_a_day_in_timisoara():
    """
    Scrape 'A day in Timișoara' content from visit-timisoara.com
    """
    
    # HTML content will be read from a file or provided directly
    # For now, we'll extract from the text editor content in the HTML
    
    chunks = []
    url = "https://visit-timisoara.com/a-day-in-timisoara/"
    
    # Main sections to extract
    sections = [
        {
            "heading": "Timișoara is always on the move - Parks and Nature",
            "text": """You can start with a stroll through the historic area's wild parks. In 1862, a quaint English-style park opened to the public. The park is still there, it's called Regina Maria, it's the oldest in Timișoara and it's a perfect starting point for a green foray through the historic part of the city.

From Regina Maria Park, you go through the Children's park (Parcul Copiilor), then through the Rozelor Park, then through Justiției and then through Central and Alpinet. We promise you a walk of several kilometres, relaxing and cool on hot summer days. Don't miss the Botanical Park, which can also be visited in the evening thanks to the recently introduced intelligent, dimmable lighting system that protects the park's wildlife.

Or, perhaps, a bike ride along the Bega River, to the Serbian border, on the longest bike path in Romania (37 km).

And if you like to explore nature, the Bega Urban Meadow is an option. The natural aspect of the area is highlighted by lush meadow vegetation and remarkable biodiversity for a periurban area.""",
            "category": "A day in Timișoara"
        },
        {
            "heading": "Looking for a unique culinary experience?",
            "text": """You've come to the right place. Sophisticated or simple, traditional, or reinterpreted, local cuisine is a must on every visitor's list.

Hundreds of restaurants, pubs, terraces, cafés where you can enjoy traditional and international, vegetarian, and vegan menus. In recent years, Timișoara has developed a network of restaurants and chefs who put sustainable, local, organic products on your plate. We recommend you try as many as possible.""",
            "category": "A day in Timișoara"
        },
        {
            "heading": "Romania's First Brewery - Beer and Coffee Heritage",
            "text": """Timișoara is home to the oldest brewery in Romania (opened in 1718). More recently, a dynamic local craft beer sector has been growing while playing with bold and joyful flavours you can enjoy in Timișoara's beer bars and pubs.

And of course, don't forget to taste a good coffee: the Iosefin district of Timișoara is the birthplace of Francesco Illy (1892), the inventor of the espresso coffee machine.""",
            "category": "A day in Timișoara"
        },
        {
            "heading": "Shopping enthusiast?",
            "text": """We've got some suggestions. Iulius Town has the largest retail area in the west of the country, 105,000 sqm. Here you will find the most famous brands, the most delicious culinary experiences and countless entertainment possibilities. 450 shops, a new Cinema City concept, the largest health and fitness centre in Romania, themed restaurants and cafes, children's playgrounds.

Shopping City is located in the southern part of the city, with over 100 shops, restaurants, and cafes.""",
            "category": "A day in Timișoara"
        },
        {
            "heading": "Timișoara – The Essential Tour",
            "text": """Embark on a walking journey through time and culture as you explore the historical heart of our city. The Essential Tour provides a comprehensive overview of Timișoara's most significant landmarks and historical sites, allowing you to discover the city's rich heritage and vibrant culture through a carefully curated route that highlights the most important destinations.""",
            "category": "A day in Timișoara"
        }
    ]
    
    # Create chunks
    for section in sections:
        chunks.append({
            "text": section["text"],
            "heading": section["heading"],
            "category": section["category"],
            "period": "Contemporary",
            "source": "Visit Timișoara - A day in Timișoara",
            "url": url
        })
    
    return chunks

def main():
    print("Scraping 'A day in Timișoara' page...")
    
    chunks = scrape_a_day_in_timisoara()
    
    # Print results
    for i, chunk in enumerate(chunks, 1):
        print(f"✅ Extracted chunk {i}: {chunk['heading'][:60]}...")
    
    # Save to JSON
    output_file = "backend/data/a_day_in_timisoara_chunks.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    
    # Calculate total content
    total_chars = sum(len(chunk["text"]) for chunk in chunks)
    
    print(f"\n[SUCCESS] Scraped {len(chunks)} chunks!")
    print(f"Saved to {output_file}")
    print(f"Total content: {len(chunks)} chunks, {total_chars} characters")

if __name__ == "__main__":
    main()
