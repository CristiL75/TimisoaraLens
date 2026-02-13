"""
Curated chunks from https://visit-timisoara.com/timisoara-revolution-89/
Focused on Revolution '89 memory sites and significance
"""

def get_timisoara_revolution_chunks():
    """Return self-contained chunks optimized for RAG about the 1989 Revolution in Timișoara."""
    chunks = [
        {
            "heading": "Revolution '89 – First city to cry Freedom",
            "text": """In December 1989, Timișoara was the first city in Romania to cry out for \"Freedom!\" against the communist regime. Traces of bullets fired at civilians are still visible on buildings in Victoriei Square. The city has urban planning rules to preserve these historical marks so visitors can witness the physical memory of the uprising.""",
            "category": "History",
            "period": "1989 Revolution",
            "source": "Visit Timișoara - Revolution '89",
            "url": "https://visit-timisoara.com/timisoara-revolution-89/",
            "keywords": ["1989", "Freedom", "Victoriei Square", "bullet traces", "first city", "revolution"]
        },
        {
            "heading": "Memorial of the Revolution – Private initiative",
            "text": """The Memorial of the Revolution in Timișoara is a private initiative keeping alive the memory of December 1989. It offers permanent and temporary exhibitions and films about the Revolution and communism, with subtitles in several international languages. Visitors get an overview of key moments from Romania's and Europe's recent history.""",
            "category": "History",
            "period": "1989 Revolution",
            "source": "Visit Timișoara - Revolution '89",
            "url": "https://visit-timisoara.com/timisoara-revolution-89/",
            "keywords": ["Memorial", "exhibitions", "films", "communism", "international subtitles"]
        },
        {
            "heading": "Future National Museum of the Anti-Communist Revolution",
            "text": """The future National Museum of the Anti-Communist Revolution of December 1989 is being set up in the former Timișoara Garrison Command in Libertății Square. The site was chosen because the first shots against peaceful demonstrators were fired here on 17 December 1989. It now hosts exhibitions as part of the Timișoara – European Capital of Culture programme.""",
            "category": "History",
            "period": "1989 Revolution",
            "source": "Visit Timișoara - Revolution '89",
            "url": "https://visit-timisoara.com/timisoara-revolution-89/",
            "keywords": ["National Museum", "Garrison", "Libertății Square", "first shots", "17 December 1989"]
        },
        {
            "heading": "Revolution memory route in Timișoara",
            "text": """Key memory points of the 1989 Revolution in Timișoara include Victoriei Square with visible bullet marks, the Memorial of the Revolution with exhibitions and films, and the future National Museum in the former Garrison at Libertății Square where the first shots were fired. Together these sites tell the story of the uprising that made Timișoara the first city free of communism in Romania.""",
            "category": "History",
            "period": "1989 Revolution",
            "source": "Visit Timișoara - Revolution '89",
            "url": "https://visit-timisoara.com/timisoara-revolution-89/",
            "keywords": ["memory route", "Victoriei Square", "Memorial", "Garrison", "first city free"]
        },
    ]
    return chunks


if __name__ == "__main__":
    chunks = get_timisoara_revolution_chunks()
    print(f"✅ Generated {len(chunks)} Revolution '89 chunks")
    for i, c in enumerate(chunks, 1):
        print(f"\n{i}. {c['heading']}")
        print(f"   Period: {c['period']}")
        print(f"   Len: {len(c['text'])} chars")
    avg = sum(len(c['text']) for c in chunks) // len(chunks)
    print(f"\n📊 Average chunk size: {avg} chars")
