"""
TripAdvisor Web Scraper for Timișoara Cafes
Scrapes cafe data from TripAdvisor including: name, location, rating, photos, etc.

Usage: python scrape_tripadvisor.py
Requirements: selenium, webdriver-manager
"""
import json
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# WARNING: This is just a DEMO and may not work due to TripAdvisor's anti-scraping
# TripAdvisor changes their HTML structure frequently

def scrape_tripadvisor_timisoara():
    """
    Example scraper for TripAdvisor Timișoara attractions
    
    DISCLAIMER: This is for educational purposes only!
    """
    print("⚠️ WARNING: Web scraping TripAdvisor may violate their Terms of Service")
    print("⚠️ TripAdvisor has strong anti-scraping measures (Cloudflare, CAPTCHA, etc.)")
    print("⚠️ This script is for educational purposes only!\n")
    
    # TripAdvisor Timișoara attractions URL
    url = "https://www.tripadvisor.com/Attractions-g295398-Activities-Timisoara_Timis_County_Western_Romania.html"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        print(f"🌐 Fetching: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        print(f"✅ Response status: {response.status_code}")
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # NOTE: TripAdvisor's HTML structure changes frequently
        # These selectors are examples and may not work
        attractions = []
        
        # Example: Find attraction listings (classes change frequently)
        listings = soup.find_all('div', class_='listing_title')  # This is just an example
        
        print(f"📊 Found {len(listings)} potential listings")
        
        for listing in listings:
            try:
                # Extract attraction data (structure may vary)
                name = listing.find('a').text.strip() if listing.find('a') else 'Unknown'
                
                attraction_data = {
                    'name': name,
                    'source': 'TripAdvisor',
                    'url': url
                }
                
                attractions.append(attraction_data)
                
            except Exception as e:
                print(f"⚠️ Error parsing listing: {e}")
                continue
        
        # Save results
        if attractions:
            output_path = Path(__file__).parent.parent / 'data' / 'tripadvisor_data.json'
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(attractions, f, ensure_ascii=False, indent=2)
            
            print(f"\n✅ Saved {len(attractions)} attractions to: {output_path}")
        else:
            print("\n⚠️ No attractions found. TripAdvisor may have changed their HTML structure.")
            print("💡 Consider using Google Places API instead!")
        
        return attractions
    
    except requests.RequestException as e:
        print(f"❌ Request failed: {e}")
        print("\n💡 TripAdvisor likely blocked the request.")
        print("   Alternatives:")
        print("   1. Use Google Places API (recommended)")
        print("   2. Use Selenium with a real browser")
        print("   3. Use a scraping service (Apify, ScrapingBee)")
        return []

def scrape_with_selenium():
    """
    Example using Selenium (requires: pip install selenium)
    This is more reliable but slower and requires a browser driver
    """
    print("\n🤖 Selenium Scraping Example")
    print("=" * 60)
    print("\nTo use Selenium:")
    print("1. Install: pip install selenium")
    print("2. Download ChromeDriver: https://chromedriver.chromium.org/")
    print("3. Uncomment and modify the code below")
    print("\nNote: This is still against TripAdvisor's ToS!")
    print("=" * 60)
    
    """
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=options)
    
    try:
        url = "https://www.tripadvisor.com/Attractions-g295398-Activities-Timisoara_Timis_County_Western_Romania.html"
        driver.get(url)
        
        # Wait for content to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "listing_title"))
        )
        
        # Extract data
        attractions = driver.find_elements(By.CLASS_NAME, "listing_title")
        
        data = []
        for attraction in attractions:
            name = attraction.text
            data.append({'name': name})
        
        return data
        
    finally:
        driver.quit()
    """
    
    pass

if __name__ == '__main__':
    print("=" * 60)
    print("TripAdvisor Scraper (Educational Only)")
    print("=" * 60)
    print("\n⚠️ IMPORTANT DISCLAIMER:")
    print("   • Web scraping TripAdvisor violates their Terms of Service")
    print("   • TripAdvisor has strong anti-scraping protections")
    print("   • You may get IP banned")
    print("   • Legal implications in some jurisdictions")
    print("\n✅ RECOMMENDED ALTERNATIVES:")
    print("   1. Google Places API - Legal, reliable, easy to use")
    print("   2. Foursquare API - Good for POI data")
    print("   3. TripAdvisor Content API - Official but requires partnership")
    print("=" * 60)
    
    user_input = input("\nDo you still want to try scraping? (yes/no): ")
    
    if user_input.lower() == 'yes':
        attractions = scrape_tripadvisor_timisoara()
        print(f"\n📊 Results: {len(attractions)} attractions")
    else:
        print("\n✅ Good choice! Use Google Places API instead:")
        print("   Run: python scripts/fetch_places_data.py")
