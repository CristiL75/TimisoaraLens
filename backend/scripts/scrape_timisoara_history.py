"""
Scrape Timișoara History Timeline - optimized for RAG chunking
Groups historical events into thematic, self-contained periods
"""

def get_timisoara_history_chunks():
    """
    Manually curated chunks from https://visit-timisoara.com/timisoara-a-short-history-timeline/
    Each chunk groups related historical events for better RAG retrieval.
    """
    
    chunks = [
        {
            "heading": "Timișoara - Medieval Foundations (1266-1552)",
            "text": """In 1266, Stephen, King of Hungary, donated the Rety land of Timis to Count Parabuch, marking the beginning of Timișoara's documented history. In 1316, Hungarian King Charles Robert of Anjou established his royal residence in Timișoara, building a castle on the site of today's Huniade Castle. This period established Timișoara as an important regional center. In 1552, the city was conquered by the Ottomans and became the capital of the Pashalik of Timișoara, beginning a period of Ottoman rule that would last until 1716.""",
            "category": "History",
            "period": "Medieval",
            "source": "Visit Timișoara - History Timeline",
            "url": "https://visit-timisoara.com/timisoara-a-short-history-timeline/",
            "keywords": ["medieval", "Ottoman", "Hungarian", "castle", "Huniade", "1266", "1316", "1552"]
        },
        
        {
            "heading": "Timișoara - Habsburg Era and Early Development (1716-1781)",
            "text": """In 1716, Timișoara was conquered by Habsburg imperial troops led by Prince Eugene of Savoy, ending Ottoman rule. In 1718, the first and oldest brewery in current day Romania was built here. A major engineering achievement came in 1728 with the regulating of the Bega and Timis rivers. Until 1988, the Bega Canal was the only navigable inland canal in Romania and the first of its kind in south-eastern Europe. In 1771, Timișoara published the first printed newspaper in present-day Romania. In 1781, Timișoara became a Free Royal City by a Diploma issued by Emperor Joseph II, gaining significant administrative autonomy.""",
            "category": "History",
            "period": "Habsburg Era",
            "source": "Visit Timișoara - History Timeline",
            "url": "https://visit-timisoara.com/timisoara-a-short-history-timeline/",
            "keywords": ["Habsburg", "Eugene of Savoy", "Bega Canal", "brewery", "Free Royal City", "1716", "1718", "1781"]
        },
        
        {
            "heading": "Timișoara - Innovation Pioneer (1869-1884)",
            "text": """Timișoara was a pioneer of innovation in the 19th century. In 1869, the first horse-drawn tramway in present-day Romania was put into service here. But the most remarkable achievement came in 1884, when Timișoara became the first city with public electric street lighting in continental Europe. Initially 300 street lamps were installed, with the number later growing to 731. This groundbreaking achievement established Timișoara's reputation as a forward-thinking, technologically advanced city.""",
            "category": "History",
            "period": "Industrial Revolution",
            "source": "Visit Timișoara - History Timeline",
            "url": "https://visit-timisoara.com/timisoara-a-short-history-timeline/",
            "keywords": ["electric lighting", "first in Europe", "tramway", "innovation", "1869", "1884"]
        },
        
        {
            "heading": "Timișoara - 20th Century Cultural Development (1936-1953)",
            "text": """In 1936, construction began on the Metropolitan Cathedral. At 90 meters tall, it was the tallest church in Romania until 2018. In 1953, Timișoara became the only city in Europe with three state theatres in three different languages (Romanian, German, Hungarian) performing in the same building. This unique cultural achievement reflects Timișoara's multicultural heritage and commitment to diversity.""",
            "category": "History",
            "period": "20th Century",
            "source": "Visit Timișoara - History Timeline",
            "url": "https://visit-timisoara.com/timisoara-a-short-history-timeline/",
            "keywords": ["Metropolitan Cathedral", "three theatres", "multicultural", "1936", "1953"]
        },
        
        {
            "heading": "Timișoara - Revolution and Freedom (1989-1990)",
            "text": """Between December 16-20, 1989, Timișoara became the birthplace of the Anti-Communist Revolution that would eventually topple Romania's communist regime. Timișoara proclaimed itself the first city free of communism in Romania, a historic achievement that inspired the rest of the country. In 1990, the Timișoara Proclamation was issued, serving as the political programme of the December 1989 Anti-Communist Revolution and outlining democratic principles for the new Romania.""",
            "category": "History",
            "period": "Modern",
            "source": "Visit Timișoara - History Timeline",
            "url": "https://visit-timisoara.com/timisoara-a-short-history-timeline/",
            "keywords": ["revolution", "1989", "freedom", "communism", "Timișoara Proclamation", "December"]
        },
        
        {
            "heading": "Timișoara - European Capital of Culture 2023",
            "text": """In 2023, Timișoara was designated European Capital of Culture, recognizing the city's rich cultural heritage, innovative spirit, and contribution to European culture. This prestigious title celebrated Timișoara's journey from a city of historical revolutions to a modern cultural hub. The recognition acknowledged Timișoara's unique position as a bridge between cultures, its pioneering achievements, and its role in shaping European democratic values.""",
            "category": "History",
            "period": "Contemporary",
            "source": "Visit Timișoara - History Timeline",
            "url": "https://visit-timisoara.com/timisoara-a-short-history-timeline/",
            "keywords": ["European Capital of Culture", "2023", "cultural heritage", "modern"]
        },
        
        {
            "heading": "Timișoara - Historical Firsts and Achievements",
            "text": """Throughout its history, Timișoara has been a city of remarkable firsts. It was the first city with electric street lighting in continental Europe (1884). The first horse-drawn tramway in present-day Romania (1869). Home to the oldest brewery in Romania (1718). The first printed newspaper in Romania (1771). The only city in Europe with three state theaters each performing in their own language (1953). And most importantly, the first city free of communism in Romania (1989). The city's motto "Besieged. Conquered. Never defeated" reflects its resilient spirit and ability to reinvent itself stronger after each challenge.""",
            "category": "History",
            "period": "Summary",
            "source": "Visit Timișoara - History Timeline",
            "url": "https://visit-timisoara.com/timisoara-a-short-history-timeline/",
            "keywords": ["firsts", "achievements", "pioneering", "innovation", "resilience", "never defeated"]
        },
    ]
    
    return chunks


if __name__ == "__main__":
    chunks = get_timisoara_history_chunks()
    
    print(f"✅ Generated {len(chunks)} optimized historical chunks")
    print("\nChunks overview:")
    for i, chunk in enumerate(chunks, 1):
        print(f"\n{i}. {chunk['heading']}")
        print(f"   Period: {chunk['period']}")
        print(f"   Keywords: {', '.join(chunk['keywords'][:5])}...")
        print(f"   Text length: {len(chunk['text'])} chars")
    
    print(f"\n📊 Total chunks: {len(chunks)}")
    print(f"📊 Average chunk size: {sum(len(c['text']) for c in chunks) // len(chunks)} chars")
