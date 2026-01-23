"""
Scrape useful information from Visit-Timisoara.com
Extracts practical info and structures it for RAG ingestion
"""

import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

def scrape_useful_info():
    """Create structured useful information from visit-timisoara.com"""
    
    url = "https://visit-timisoara.com/useful-info/"
    
    print(f"📝 Structuring useful info from {url}...")
    
    # Extract structured sections (data already collected)
    documents = []
    
    # Manual extraction based on the content structure
    useful_info_sections = [
        {
            "heading": "Emergency number",
            "text": """112 is the universal emergency number available throughout Romania, which can be dialed from all public telephone networks. This number provides immediate access to emergency services including police, ambulance, and fire department.""",
            "category": "Emergency Services"
        },
        {
            "heading": "Telephony in Romania",
            "text": """In Romania, there are 4 mobile phone networks: Orange, Vodafone, Telekom, and Digi. For EU residents, there are no additional charges for roaming. For residents from non-EU countries, it is more advantageous to purchase a prepaid SIM card from one of the 4 local operators.""",
            "category": "Communications"
        },
        {
            "heading": "WiFi Availability",
            "text": """Most establishments in Timișoara (terraces, restaurants) offer free WiFi. You just need to ask for the password. Some public places (parks, squares) and shopping centers offer password-free WiFi access.""",
            "category": "Communications"
        },
        {
            "heading": "Electricity and Power Plugs",
            "text": """Romania uses Type C and Type F electrical plugs. The standard voltage is 230V and the standard frequency is 50Hz. Travelers from countries using different plug types should bring appropriate adapters.""",
            "category": "Practical Information"
        },
        {
            "heading": "Language in Timișoara",
            "text": """Romanian is the official language commonly used in the country, but English is commonly spoken in most major cities and towns including Timișoara. Common Romanian phrases: Thank you - Mulțumesc, Good morning - Bună dimineața, Hello - Bună ziua, Good evening - Bună seara, How are you - Ce mai faci?""",
            "category": "Language & Culture"
        },
        {
            "heading": "Weather Information",
            "text": """Up-to-date weather information for Timișoara can be accessed at www.meteoblue.com. Timișoara has a temperate continental climate with four distinct seasons.""",
            "category": "Weather"
        },
        {
            "heading": "Parking in Timișoara - Timpark System",
            "text": """Most streets in the central area are included in the Timpark parking system. Tariff zones are marked with plates of different colors. The green zone has a progressive tariff (2-8 lei per hour), while the hourly tariff remains unchanged in other zones. Payment can be made via SMS (for local mobile phone networks) or by credit card through the Tpark application available on Google Play or App Store.""",
            "category": "Transportation & Parking"
        },
        {
            "heading": "Local Currency & Banks",
            "text": """The local currency used for cash payments is the Romanian Leu (RON). Credit cards (Visa, MasterCard, Maestro) are accepted almost everywhere. ATMs can be found throughout the city. Most stores do not accept foreign currency - you must exchange money to Lei in advance or pay by credit card. American Express and Diners Club are rarely accepted. EUR, USD, GBP can be easily exchanged in any town. Banking hours are 9 AM to 5 PM, Monday to Friday. Shopping mall bank offices are open until 9-10 PM.""",
            "category": "Money & Banking"
        },
        {
            "heading": "Airport Connection - E4 and E4b Buses",
            "text": """Connection to Traian Vuia International Airport is provided by buses E4 and E4b. These buses operate between Bastion station and the Airport, as well as between North Railway Station and the Airport. Schedules can be found on the STPT website at stpt.ro/en/airport.html.""",
            "category": "Transportation & Parking"
        },
        {
            "heading": "Public Transport Tickets & Fares",
            "text": """Public transport tickets cost 4 lei for 60 minutes and can be purchased on the bus with bank card, through SMS, or using 24pay or mobilPay applications. Paper tickets can be purchased from STPT kiosks and must be validated upon boarding. 1-day subscriptions cost 15 lei and can be purchased from STPT kiosks or online. For other subscription types, visit stpt.ro/en.""",
            "category": "Transportation & Parking"
        },
        {
            "heading": "Public Transport Types and Routes",
            "text": """Public transportation within Timișoara includes trams, buses, trolleybuses, and vaporettos. With a 1-hour ticket (4 lei), multiple means of public transportation can be used, except for vaporettos. Vaporettos operate on the Bega Canal covering the entire length of the city. A vaporetto journey costs 1 leu, and tickets can be purchased on board with bank card or cash. Metropolitan lines (M) connect Timișoara with surrounding municipalities operated by STPT.""",
            "category": "Transportation & Parking"
        },
        {
            "heading": "Free Bicycle Rental",
            "text": """You can borrow bicycles for free within the municipality of Timișoara. For assistance and to arrange bicycle rental, please approach an employee at an STPT kiosk.""",
            "category": "Transportation & Parking"
        },
        {
            "heading": "Tourist Infocenter Timișoara",
            "text": """Tourist Infocenter is located at 2 Alba Iulia Street, 300077 Timișoara. Contact email: infoturism@primariatm.ro. Website: www.timisoara-info.ro. The center provides tourist information, maps, and assistance for visitors.""",
            "category": "Tourist Information"
        },
        {
            "heading": "Timișoara City Hall Contact",
            "text": """Timișoara City Hall is located at 1 C.D. Loga Boulevard, 300030 Timișoara. Contact email: primariatm@primariatm.ro. Website: www.primariatm.ro.""",
            "category": "Official Contacts"
        },
    ]
    
    # Add metadata and structure
    for section in useful_info_sections:
        doc = {
            "heading": section["heading"],
            "text": section["text"],
            "source": "Visit-Timisoara.com - Useful Info",
            "url": url,
            "category": section["category"],
            "scraped_at": datetime.now().isoformat(),
            "type": "useful_info"
        }
        documents.append(doc)
    
    return documents


def save_to_json(documents, output_file):
    """Save documents to JSON file"""
    print(f"💾 Saving {len(documents)} documents to {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)
    print(f"✅ Saved successfully!")


if __name__ == "__main__":
    print("🔍 Starting Visit-Timisoara.com scraping...")
    
    # Scrape
    docs = scrape_useful_info()
    
    # Save
    output_path = "backend/data/visit_timisoara_useful_info.json"
    save_to_json(docs, output_path)
    
    print(f"\n📊 Summary:")
    print(f"  Total documents: {len(docs)}")
    print(f"  Categories: {set(d['category'] for d in docs)}")
    print(f"\n✨ Ready for embedding and upserting to Qdrant!")
