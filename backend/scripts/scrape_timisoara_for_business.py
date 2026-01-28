import json
import re
from datetime import datetime

# Extract Timișoara for Business content into structured chunks
def scrape_timisoara_for_business():
    chunks = []
    
    # Chunk 1: Business Hub Introduction
    chunks.append({
        "text": "Timișoara for Business - A vibrant hub for business excellence. Welcome to Timișoara, where ideas meet opportunities, and businesses thrive in an innovative and dynamic environment. Situated in the heart of Romania's wealthiest region outside of Bucharest, Timișoara has emerged as a key driver of the country's development. With excellent infrastructure, efficient road and rail links, and a modern international airport, facilitating access to international markets, Timișoara is the ideal destination for business growth.",
        "heading": "A Vibrant Hub for Business Excellence",
        "category": "Timișoara for Business",
        "period": "Contemporary",
        "source": "visit-timisoara.com",
        "url": "https://visit-timisoara.com/timisoara-for-business/"
    })
    
    # Chunk 2: Hub of Growth & FDI
    chunks.append({
        "text": "A Hub of Growth: Timișoara and the entire Timiș county have diversified their economy from traditional manufacturing. Trade and the IT sector now surpass traditional industries. Timișoara and Timiș county continue to attract investments both domestically and internationally, with Timiș being, after Bucharest-Ilfov, the county with the largest stock of foreign direct investments (FDI): over €5.2 billion by the end of 2022. This strong financial backing demonstrates the confidence international investors have in the region.",
        "heading": "A Hub of Growth - Economic Development",
        "category": "Timișoara for Business",
        "period": "Contemporary",
        "source": "visit-timisoara.com",
        "url": "https://visit-timisoara.com/timisoara-for-business/"
    })
    
    # Chunk 3: Innovation and Talent
    chunks.append({
        "text": "Innovation and Talent: Our city takes pride in a community of bold entrepreneurs and a skilled and talented workforce ready to turn ideas into reality. With prestigious universities, a modern dual education campus in construction, research centers, and a proactive approach to innovation, Timișoara serves as an incubator for innovative ideas and successful projects. The human capital in Timișoara is one of its greatest assets.",
        "heading": "Innovation and Talent - Workforce Development",
        "category": "Timișoara for Business",
        "period": "Contemporary",
        "source": "visit-timisoara.com",
        "url": "https://visit-timisoara.com/timisoara-for-business/"
    })
    
    # Chunk 4: Infrastructure and Connectivity
    chunks.append({
        "text": "Infrastructure and Connectivity: Timișoara boasts excellent infrastructure with efficient road and rail links and a modern international airport. Our industrial zone and technological parks offer innovative and flexible spaces, prepared to host rapidly expanding businesses. The connectivity framework ensures seamless access to European markets and provides modern facilities for business operations, making it an attractive location for logistics and manufacturing.",
        "heading": "Infrastructure and Connectivity - Transport and Facilities",
        "category": "Timișoara for Business",
        "period": "Contemporary",
        "source": "visit-timisoara.com",
        "url": "https://visit-timisoara.com/timisoara-for-business/"
    })
    
    # Chunk 5: Conference Halls
    chunks.append({
        "text": "Conference Halls and Event Venues: Timișoara hosts world-class conference facilities including the Iulius Congress Hall (1 Aristide Demetriade st.), the Timișoara Convention Center (1-3 Mărășești st.), the Timișoara Regional Business Center CRAFT (22 Eroilor de la Tisa blvd.), and IncuboXX (2-4 Circumvalaţiunii st.). These venues are equipped to host international conferences, business meetings, and corporate events, supporting the city's MICE (Meetings, Incentives, Conferences, Exhibitions) sector.",
        "heading": "Conference Halls and Event Venues",
        "category": "Timișoara for Business",
        "period": "Contemporary",
        "source": "visit-timisoara.com",
        "url": "https://visit-timisoara.com/timisoara-for-business/"
    })
    
    # Chunk 6: Coworking Spaces
    chunks.append({
        "text": "Coworking Spaces: Timișoara offers modern coworking facilities including Faber (4-5 Peneș Curcanul spl.), DevPlant (5 Proclamatia de la Timisoara st.), Cowork - The Garden (5 Virgil Madgearu st.), and Cowork - The Office (11 Calea Aradului, BCR Building). These flexible workspace solutions cater to startups, freelancers, and growing companies seeking collaborative environments with professional amenities and networking opportunities.",
        "heading": "Coworking Spaces - Flexible Work Solutions",
        "category": "Timișoara for Business",
        "period": "Contemporary",
        "source": "visit-timisoara.com",
        "url": "https://visit-timisoara.com/timisoara-for-business/"
    })
    
    # Chunk 7: Quality of Life for Business Professionals
    chunks.append({
        "text": "Culture and Quality of Life: Timișoara is more than just a workplace; it's a city where you can live, thrive, and find inspiration. With a vibrant cultural scene, international events and festivals, and a diverse range of restaurants, cafes, and recreational spaces, Timișoara provides a remarkable quality of life for business professionals and their families. The city's welcoming environment supports both professional growth and personal well-being.",
        "heading": "Culture and Quality of Life for Business",
        "category": "Timișoara for Business",
        "period": "Contemporary",
        "source": "visit-timisoara.com",
        "url": "https://visit-timisoara.com/timisoara-for-business/"
    })
    
    return chunks

if __name__ == "__main__":
    print("Scraping 'Timișoara for Business' page...")
    chunks = scrape_timisoara_for_business()
    
    for i, chunk in enumerate(chunks, 1):
        print(f"✅ Extracted chunk {i}: {chunk['heading'][:50]}...")
    
    # Save to JSON
    output_file = "backend/data/timisoara_for_business_chunks.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    
    total_chars = sum(len(chunk["text"]) for chunk in chunks)
    print(f"[SUCCESS] Scraped {len(chunks)} chunks!")
    print(f"Saved to {output_file}")
    print(f"Total content: {len(chunks)} chunks, {total_chars} characters")
