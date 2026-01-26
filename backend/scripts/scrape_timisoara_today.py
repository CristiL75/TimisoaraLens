"""
Scrape Timișoara Today page - optimized for RAG chunking
Groups information into semantic, self-contained chunks
"""

def get_timisoara_today_chunks():
    """
    Manually curated chunks from https://visit-timisoara.com/timisoara-today/
    Each chunk is self-contained and optimized for RAG retrieval.
    """
    
    chunks = [
        {
            "heading": "Timișoara - Diversity and Multicultural Identity",
            "text": """Timișoara has the most diverse ethnic and confessional structure in Romania, with 21 ethnic groups from 18 religious denominations living here in harmony and tolerance. This remarkable diversity is not just a demographic fact, but the driving force behind Timișoara's development and cultural richness. The city's multicultural heritage creates a unique atmosphere of openness and acceptance that distinguishes it from other Romanian cities.""",
            "category": "City Overview",
            "source": "Visit Timișoara - Timișoara Today",
            "url": "https://visit-timisoara.com/timisoara-today/",
            "keywords": ["diversity", "multicultural", "ethnic groups", "tolerance", "culture"]
        },
        
        {
            "heading": "Timișoara - Population and Student Community",
            "text": """Timișoara is home to more than 300,000 inhabitants, making it one of Romania's major urban centers. The city has a particularly vibrant student community, with more than 45,000 young people studying in Timișoara's universities. This large student population contributes significantly to the city's dynamic atmosphere, cultural scene, and innovative spirit, making Timișoara a youthful and energetic city.""",
            "category": "Demographics",
            "source": "Visit Timișoara - Timișoara Today",
            "url": "https://visit-timisoara.com/timisoara-today/",
            "keywords": ["population", "students", "universities", "youth", "education"]
        },
        
        {
            "heading": "Timișoara - Economic Hub of Western Romania",
            "text": """Timișoara is the capital of the West Region, which is Romania's most developed region after Bucharest. The region boasts a GDP per capita of 75% of the European average, according to European Commission data. This economic performance reflects Timișoara's strategic importance as a business and innovation center in Romania, attracting both domestic and international investments.""",
            "category": "Economy",
            "source": "Visit Timișoara - Timișoara Today",
            "url": "https://visit-timisoara.com/timisoara-today/",
            "keywords": ["economy", "GDP", "West Region", "development", "business"]
        },
        
        {
            "heading": "Timișoara - Real Estate Investment Leader",
            "text": """On the real estate market, Timișoara has around one billion euros of investments in progress. This represents half of the urban real estate investments in Romania, except for the capital Bucharest. This massive investment activity demonstrates the city's rapid growth and attractiveness for developers, businesses, and residents alike. The real estate boom reflects confidence in Timișoara's future as a major European city.""",
            "category": "Real Estate",
            "source": "Visit Timișoara - Timișoara Today",
            "url": "https://visit-timisoara.com/timisoara-today/",
            "keywords": ["real estate", "investments", "development", "construction", "urban growth"]
        },
        
        {
            "heading": "Timișoara - Automotive and Bicycle Manufacturing Hub",
            "text": """Timișoara is an important hub for the automotive industry, playing a significant role in Romania's manufacturing sector. In recent years, the city has also become a major center for bicycle manufacturers. Around 1.5 million bicycles are produced annually in Timișoara for both domestic and international markets. This industrial diversity showcases the city's ability to combine traditional automotive manufacturing with modern, sustainable transportation solutions.""",
            "category": "Industry",
            "source": "Visit Timișoara - Timișoara Today",
            "url": "https://visit-timisoara.com/timisoara-today/",
            "keywords": ["automotive", "bicycles", "manufacturing", "industry", "production"]
        },
        
        {
            "heading": "Timișoara City Hall - Contact Information",
            "text": """Timișoara City Hall is located at 1 C.D. Loga Boulevard, 300030 Timișoara. For official matters and inquiries, you can contact them via email at primariatm@primariatm.ro or visit their official website at www.primariatm.ro. The City Hall handles administrative services, permits, and public information for residents and visitors.""",
            "category": "Contact Information",
            "source": "Visit Timișoara - Timișoara Today",
            "url": "https://visit-timisoara.com/timisoara-today/",
            "keywords": ["city hall", "contact", "primaria", "administration", "official"]
        },
        
        {
            "heading": "Tourist Infocenter Timișoara - Visitor Services",
            "text": """The Tourist Infocenter is located at 2 Alba Iulia Street, 300077 Timișoara. For tourist information, maps, recommendations, and assistance, you can contact them at infoturism@primariatm.ro or visit www.timisoara-info.ro. The Infocenter provides valuable resources for both tourists and locals looking to explore the city's attractions, events, and services.""",
            "category": "Contact Information",
            "source": "Visit Timișoara - Timișoara Today",
            "url": "https://visit-timisoara.com/timisoara-today/",
            "keywords": ["tourist info", "visitor center", "tourism", "information", "assistance"]
        },
    ]
    
    return chunks


if __name__ == "__main__":
    chunks = get_timisoara_today_chunks()
    
    print(f"✅ Generated {len(chunks)} optimized chunks from Timișoara Today")
    print("\nChunks overview:")
    for i, chunk in enumerate(chunks, 1):
        print(f"\n{i}. {chunk['heading']}")
        print(f"   Category: {chunk['category']}")
        print(f"   Keywords: {', '.join(chunk['keywords'])}")
        print(f"   Text length: {len(chunk['text'])} chars")
    
    print(f"\n📊 Total chunks: {len(chunks)}")
    print(f"📊 Average chunk size: {sum(len(c['text']) for c in chunks) // len(chunks)} chars")
