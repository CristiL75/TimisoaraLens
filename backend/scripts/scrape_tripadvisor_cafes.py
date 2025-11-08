"""
TripAdvisor Cafe Scraper for Timișoara
Scrapes cafe data from TripAdvisor including: name, location, rating, photos, reviews, etc.

Usage: 
    pip install selenium webdriver-manager
    python scrape_tripadvisor_cafes.py

Output: data/tripadvisor_cafes.json
"""
import json
import time
import re
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# TripAdvisor URL pentru cafenele în Timișoara
CAFES_URL = "https://www.tripadvisor.com/FindRestaurants?geo=298478&cuisines=10642&establishmentTypes=9900&broadened=false"

def setup_driver():
    """
    Setup Chrome WebDriver with ADVANCED anti-detection options
    """
    print("🚀 Setting up Chrome WebDriver with stealth mode...")
    
    chrome_options = Options()
    
    # Basic settings
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--disable-infobars')
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--start-maximized')
    
    # Advanced anti-detection
    chrome_options.add_argument('--disable-web-security')
    chrome_options.add_argument('--allow-running-insecure-content')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Realistic user agent (latest Chrome)
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    
    # Additional preferences to look more human
    prefs = {
        "profile.default_content_setting_values.notifications": 2,
        "credentials_enable_service": False,
        "profile.password_manager_enabled": False,
        "profile.default_content_settings.popups": 0,
    }
    chrome_options.add_experimental_option("prefs", prefs)
    
    # Use webdriver_manager to automatically download and manage chromedriver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Advanced JavaScript injection to hide automation
    stealth_js = """
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
        
        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
        });
        
        // Mock languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
        });
        
        // Chrome present
        window.chrome = {
            runtime: {}
        };
        
        // Permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    """
    
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': stealth_js
    })
    
    print("✅ Stealth WebDriver ready!")
    return driver

def human_like_delay(min_seconds=1, max_seconds=3):
    """
    Random delay to mimic human behavior
    """
    import random
    delay = random.uniform(min_seconds, max_seconds)
    time.sleep(delay)

def check_for_block(driver):
    """
    Check if TripAdvisor blocked us
    """
    page_source = driver.page_source.lower()
    
    block_indicators = [
        'comportamentul browserului',
        'robot virtual',
        'blocked',
        'captcha',
        'access denied',
        'unusual traffic',
    ]
    
    for indicator in block_indicators:
        if indicator in page_source:
            print(f"⚠️ DETECTED BLOCK: '{indicator}' found in page")
            return True
    
    return False

def wait_for_human_if_blocked(driver):
    """
    If blocked, pause and let user solve CAPTCHA manually
    """
    if check_for_block(driver):
        print("\n" + "="*70)
        print("🛑 TripAdvisor BLOCKED THE REQUEST!")
        print("="*70)
        print("\n⚠️ Browser window is open. Please:")
        print("   1. Solve the CAPTCHA manually in the browser")
        print("   2. Wait for the page to load")
        print("   3. Press Enter here to continue...\n")
        
        input("Press Enter after solving CAPTCHA...")
        human_like_delay(2, 3)
        return True
    
    return False

def scroll_page(driver, scrolls=3):
    """
    Scroll the page NATURALLY like a human to load all cafes
    """
    import random
    print(f"📜 Scrolling page naturally {scrolls} times to load all content...")
    
    for i in range(scrolls):
        # Random scroll distance (not always to bottom)
        scroll_height = driver.execute_script("return document.body.scrollHeight")
        random_position = random.randint(int(scroll_height * 0.6), scroll_height)
        
        # Smooth scroll like a human
        driver.execute_script(f"window.scrollTo({{top: {random_position}, behavior: 'smooth'}});")
        
        # Random pause (humans don't scroll at constant speed)
        human_like_delay(2, 4)
        print(f"   Scroll {i+1}/{scrolls}")
    
    # Scroll back to top smoothly
    driver.execute_script("window.scrollTo({top: 0, behavior: 'smooth'});")
    human_like_delay(1, 2)

def extract_cafe_data(driver, cafe_element):
    """
    Extract data from a single cafe element
    """
    cafe_data = {
        'name': None,
        'rating': None,
        'num_reviews': None,
        'price_range': None,
        'cuisines': [],
        'address': None,
        'url': None,
        'image_url': None,
        'description': None
    }
    
    try:
        # Extract name
        try:
            name_elem = cafe_element.find_element(By.CSS_SELECTOR, 'a[class*="Title"]')
            cafe_data['name'] = name_elem.text.strip()
            cafe_data['url'] = name_elem.get_attribute('href')
            print(f"   📍 Found: {cafe_data['name']}")
        except NoSuchElementException:
            print("   ⚠️ Name not found")
        
        # Extract rating
        try:
            rating_elem = cafe_element.find_element(By.CSS_SELECTOR, 'svg[aria-label*="bubbles"]')
            rating_text = rating_elem.get_attribute('aria-label')
            # Extract number from "5.0 of 5 bubbles"
            rating_match = re.search(r'(\d+\.?\d*)', rating_text)
            if rating_match:
                cafe_data['rating'] = float(rating_match.group(1))
        except NoSuchElementException:
            pass
        
        # Extract number of reviews
        try:
            reviews_elem = cafe_element.find_element(By.CSS_SELECTOR, 'span[class*="reviews"]')
            reviews_text = reviews_elem.text
            # Extract number from "123 reviews"
            reviews_match = re.search(r'(\d+)', reviews_text)
            if reviews_match:
                cafe_data['num_reviews'] = int(reviews_match.group(1))
        except NoSuchElementException:
            pass
        
        # Extract price range
        try:
            price_elem = cafe_element.find_element(By.CSS_SELECTOR, 'span[class*="price"]')
            cafe_data['price_range'] = price_elem.text.strip()
        except NoSuchElementException:
            pass
        
        # Extract cuisines
        try:
            cuisine_elems = cafe_element.find_elements(By.CSS_SELECTOR, 'span[class*="cuisine"]')
            cafe_data['cuisines'] = [c.text.strip() for c in cuisine_elems if c.text.strip()]
        except NoSuchElementException:
            pass
        
        # Extract address
        try:
            address_elem = cafe_element.find_element(By.CSS_SELECTOR, 'span[class*="address"]')
            cafe_data['address'] = address_elem.text.strip()
        except NoSuchElementException:
            pass
        
        # Extract image
        try:
            img_elem = cafe_element.find_element(By.CSS_SELECTOR, 'img')
            cafe_data['image_url'] = img_elem.get_attribute('src')
        except NoSuchElementException:
            pass
        
        # Extract description/snippet
        try:
            desc_elem = cafe_element.find_element(By.CSS_SELECTOR, 'div[class*="description"]')
            cafe_data['description'] = desc_elem.text.strip()
        except NoSuchElementException:
            pass
        
    except Exception as e:
        print(f"   ⚠️ Error extracting cafe data: {e}")
    
    return cafe_data

def scrape_cafes():
    """
    Main scraping function for TripAdvisor cafes
    """
    print("=" * 70)
    print("🎯 TripAdvisor Cafe Scraper - Timișoara")
    print("=" * 70)
    print(f"\n🔗 Target URL: {CAFES_URL}\n")
    
    driver = None
    cafes = []
    
    try:
        # Setup driver
        driver = setup_driver()
        
        # Navigate to cafes page
        print(f"🌐 Loading page...")
        driver.get(CAFES_URL)
        
        # Wait for page to load - longer to avoid detection
        print("⏳ Waiting for content to load (mimicking human behavior)...")
        human_like_delay(5, 8)
        
        # Take screenshot for debugging
        screenshot_path = Path(__file__).parent.parent / 'data' / 'tripadvisor_screenshot.png'
        screenshot_path.parent.mkdir(parents=True, exist_ok=True)
        driver.save_screenshot(str(screenshot_path))
        print(f"📸 Screenshot saved: {screenshot_path}")
        
        # Check if we're blocked
        was_blocked = wait_for_human_if_blocked(driver)
        if was_blocked:
            print("✅ Continuing after manual intervention...")
        
        # Scroll to load all cafes
        scroll_page(driver, scrolls=3)
        
        # Check again after scrolling
        if check_for_block(driver):
            print("⚠️ Still blocked after scrolling. Trying to continue anyway...")
            driver.save_screenshot(str(screenshot_path.parent / 'blocked_screenshot.png'))
        
        # Wait for restaurant listings to appear
        print("🔍 Looking for cafe listings...")
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div[data-test*="restaurant"]'))
            )
        except TimeoutException:
            print("⚠️ Timeout waiting for listings. Trying alternative selectors...")
        
        # Find all cafe elements - try MANY different selectors
        selectors = [
            # Data attributes
            'div[data-test*="restaurant"]',
            'a[data-test*="restaurant"]',
            'div[data-automation*="restaurant"]',
            # Class patterns
            'div[class*="restaurant"]',
            'div[class*="listing"]',
            'div[class*="establishment"]',
            'article[class*="restaurant"]',
            # Structure-based
            'div.result-card',
            'div.search-result',
            'a[href*="/Restaurant_Review"]',
            # Generic containers
            'div[class*="Card"]',
            'a[class*="Title"]',
        ]
        
        cafe_elements = []
        for selector in selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements and len(elements) > 5:  # Need at least 5 to be valid
                    cafe_elements = elements
                    print(f"✅ Found {len(cafe_elements)} elements with selector: {selector}")
                    break
                elif elements:
                    print(f"   Found only {len(elements)} with {selector}, trying next...")
            except Exception as e:
                print(f"   Selector {selector} failed: {e}")
                continue
        
        if not cafe_elements:
            print("❌ No cafe elements found. Saving page source for debugging...")
            # Save page source for debugging
            debug_path = Path(__file__).parent.parent / 'data' / 'tripadvisor_debug.html'
            debug_path.parent.mkdir(parents=True, exist_ok=True)
            with open(debug_path, 'w', encoding='utf-8') as f:
                f.write(driver.page_source)
            print(f"💾 Page source saved to: {debug_path}")
            return []
        
        print(f"\n📊 Processing {len(cafe_elements)} cafes...\n")
        
        # Extract data from each cafe
        for idx, cafe_elem in enumerate(cafe_elements, 1):
            print(f"🔍 Cafe {idx}/{len(cafe_elements)}:")
            cafe_data = extract_cafe_data(driver, cafe_elem)
            
            # Only add if we got at least the name
            if cafe_data['name']:
                cafes.append(cafe_data)
            else:
                print("   ⚠️ Skipping - no name found")
            
            print()
        
        print(f"\n✅ Successfully extracted data for {len(cafes)} cafes!")
        
    except Exception as e:
        print(f"\n❌ Error during scraping: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if driver:
            print("\n🔒 Closing browser...")
            driver.quit()
    
    return cafes

def save_cafes_data(cafes):
    """
    Save scraped cafe data to JSON file
    """
    if not cafes:
        print("\n⚠️ No cafes to save!")
        return
    
    output_path = Path(__file__).parent.parent / 'data' / 'tripadvisor_cafes.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Add metadata
    output_data = {
        'source': 'TripAdvisor',
        'location': 'Timișoara, Romania',
        'category': 'Cafes',
        'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'total_count': len(cafes),
        'cafes': cafes
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Data saved to: {output_path}")
    print(f"📊 Total cafes saved: {len(cafes)}")
    
    # Print summary
    print("\n" + "=" * 70)
    print("📈 SUMMARY")
    print("=" * 70)
    
    cafes_with_rating = [c for c in cafes if c['rating']]
    if cafes_with_rating:
        avg_rating = sum(c['rating'] for c in cafes_with_rating) / len(cafes_with_rating)
        print(f"Average Rating: {avg_rating:.2f} ⭐")
    
    cafes_with_reviews = [c for c in cafes if c['num_reviews']]
    if cafes_with_reviews:
        total_reviews = sum(c['num_reviews'] for c in cafes_with_reviews)
        print(f"Total Reviews: {total_reviews}")
    
    print(f"\nTop 5 Cafes by Rating:")
    sorted_cafes = sorted(
        [c for c in cafes if c['rating']], 
        key=lambda x: (x['rating'], x['num_reviews'] or 0), 
        reverse=True
    )
    for i, cafe in enumerate(sorted_cafes[:5], 1):
        print(f"{i}. {cafe['name']} - ⭐ {cafe['rating']} ({cafe['num_reviews']} reviews)")

if __name__ == '__main__':
    print("\n⚠️  DISCLAIMER:")
    print("   This scraper is for educational/research purposes.")
    print("   Always check TripAdvisor's Terms of Service.")
    print("   For commercial use, consider TripAdvisor Content API.\n")
    
    input("Press Enter to continue...")
    
    # Scrape cafes
    cafes = scrape_cafes()
    
    # Save data
    if cafes:
        save_cafes_data(cafes)
    else:
        print("\n❌ No data scraped. Check the debug output above.")
    
    print("\n" + "=" * 70)
    print("✅ Script completed!")
    print("=" * 70)
