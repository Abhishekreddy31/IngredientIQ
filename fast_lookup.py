#!/usr/bin/env python3
import sys, re, time, concurrent.futures, requests, os, io, shutil, subprocess, json
import pytesseract
from PIL import Image
from urllib.parse import urlparse
from pathlib import Path
from datetime import datetime

# Primary database: Open Food Facts
OFF_BASES = [
    "https://world.openfoodfacts.org",
    "https://in.openfoodfacts.org",
    "https://uk.openfoodfacts.org",
]
OFF_FIELDS = "code,product_name,brands,ingredients_text,ingredients,image_ingredients_url,countries"

# Secondary database: Open Beauty Facts (for cosmetics and personal care products)
OBF_BASES = [
    "https://world.openbeautyfacts.org",
]
OBF_FIELDS = "code,product_name,brands,ingredients_text,ingredients,image_ingredients_url,countries"

# Third database: Open Pet Food Facts (for pet food products)
OPFF_BASES = [
    "https://world.openpetfoodfacts.org",
]
OPFF_FIELDS = "code,product_name,brands,ingredients_text,ingredients,image_ingredients_url,countries"

CONNECT_TIMEOUT = 1.2   # seconds
READ_TIMEOUT    = 2.2   # seconds
GLOBAL_DEADLINE = 5.0   # seconds (hard limit)

UA = {"User-Agent": "IngredientIQ/1.0 (+local-fast-timeout)"}

# Cache configuration
CACHE_DIR = Path.home() / ".ingredientiq" / "cache"
CACHE_EXPIRY_DAYS = 30  # How long to keep cached products

# OCR Configuration
OCR_CONFIG = '--psm 6 --oem 3'
# PSM 6 = Assume a single uniform block of text
# OEM 3 = Default, based on what is available

def check_tesseract_installed():
    """Check if Tesseract OCR is installed and available"""
    tesseract_path = shutil.which('tesseract')
    if not tesseract_path:
        print("⚠️ Tesseract OCR is not installed or not in PATH.")
        print("Please install Tesseract OCR to use the OCR features:")
        print("  - macOS: brew install tesseract")
        print("  - Linux: sudo apt-get install tesseract-ocr")
        print("  - Windows: Download installer from https://github.com/UB-Mannheim/tesseract/wiki")
        return False
    return True

def validate_ean13(code: str) -> tuple:
    """Validate an EAN-13 barcode and return (is_valid, reason)"""
    # Check if it's 13 digits
    if len(code) != 13:
        return False, f"EAN-13 must be exactly 13 digits (got {len(code)})"
    
    # Check if all characters are digits
    if not code.isdigit():
        return False, "EAN-13 must contain only digits"
    
    # Validate the checksum
    # For EAN-13, multiply each digit by 1 or 3 alternately, sum them,
    # and check if the sum modulo 10 is 0
    total = 0
    for i, digit in enumerate(code[:-1]):  # Exclude the check digit
        if i % 2 == 0:
            total += int(digit)
        else:
            total += 3 * int(digit)
    
    check_digit = (10 - (total % 10)) % 10
    if check_digit != int(code[-1]):
        return False, f"Invalid checksum (expected {check_digit}, got {code[-1]})"
    
    return True, "Valid EAN-13 barcode"

def ean13_hint(code: str) -> bool:
    """Simple check if the code looks like an EAN-13 barcode"""
    return len(code) == 13 and code.isdigit()

def split_ingredients(text: str):
    if not text:
        return []
    out, buf, depth = [], "", 0
    for ch in text:
        if ch == "(":
            depth += 1; buf += ch
        elif ch == ")":
            depth = max(0, depth-1); buf += ch
        elif ch in [",",";"] and depth == 0:
            if buf.strip(): out.append(buf.strip()); buf=""
        else:
            buf += ch
    if buf.strip(): out.append(buf.strip())
    return [re.sub(r"\s+", " ", i).strip() for i in out]

def preprocess_image_for_ocr(image):
    """Apply advanced preprocessing to improve OCR accuracy"""
    # Convert to grayscale if it's not already
    if image.mode != 'L':
        image = image.convert('L')
    
    # Apply advanced image enhancements
    from PIL import ImageEnhance, ImageFilter
    
    # Apply noise reduction
    image = image.filter(ImageFilter.MedianFilter(size=3))
    
    # Increase contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.5)  # Higher contrast
    
    # Increase brightness slightly
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(1.2)  # Slightly brighter
    
    # Increase sharpness
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.5)  # Higher sharpness
    
    # Resize for optimal OCR performance
    if image.width < 1200 or image.height < 1200:
        ratio = max(1200/image.width, 1200/image.height)
        new_width = int(image.width * ratio)
        new_height = int(image.height * ratio)
        image = image.resize((new_width, new_height), Image.LANCZOS)
    
    # Apply thresholding to make text more distinct
    threshold = 150
    return image.point(lambda p: p > threshold and 255)

def extract_ingredients_from_ocr_text(text):
    """Process OCR text to extract ingredients with high accuracy"""
    if not text:
        return []
    
    # Clean up the text
    text = text.replace('\n', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    
    # First, try to find the ingredients section using common patterns
    ingredients_section = text
    
    # More comprehensive patterns to identify ingredient sections
    patterns = [
        # Standard ingredient labels
        r'ingredients\s*:(.+?)(?:\.|$|nutrition|allergens|contains|may contain|store|keep|best before)',
        r'ingredients\s*list\s*:(.+?)(?:\.|$|nutrition|allergens)',
        r'contains\s*:(.+?)(?:\.|$|nutrition|allergens|may contain)',
        r'made with\s*:(.+?)(?:\.|$|nutrition|allergens)',
        r'made from\s*:(.+?)(?:\.|$|nutrition|allergens)',
        # Just the word INGREDIENTS followed by text
        r'ingredients[\s\n]*([\w\s\(\)\[\]\{\}\.,;:\-\/\&\+\%\*\!\?]+)(?:\.|$|nutrition|allergens|contains|may contain)',
        # For products that just list ingredients without a header
        r'((?:[\w\s]+(?:,|;)\s*){3,})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower(), re.IGNORECASE | re.DOTALL)
        if match:
            ingredients_section = match.group(1).strip()
            break
    
    # If we couldn't find a clear ingredients section, use the whole text
    # but try to clean it up by removing obvious non-ingredient text
    if ingredients_section == text:
        # Remove common non-ingredient sections
        text = re.sub(r'nutrition\s+facts.*', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'allergen\s+information.*', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'storage\s+instructions.*', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'best\s+before.*', '', text, flags=re.IGNORECASE | re.DOTALL)
        ingredients_section = text
    
    # Use the existing split_ingredients function to parse the ingredients
    ingredients = split_ingredients(ingredients_section)
    
    # Filter out non-ingredient items (like headers, nutritional info)
    filtered_ingredients = []
    non_ingredients = ['nutrition', 'facts', 'serving', 'allergen', 'warning', 'manufactured', 'facility']
    
    for item in ingredients:
        # Skip items that are likely not ingredients
        if any(non_ing in item.lower() for non_ing in non_ingredients):
            continue
        # Skip items that are too short to be ingredients
        if len(item) < 3:
            continue
        filtered_ingredients.append(item)
    
    return filtered_ingredients

def perform_ocr_on_image(image):
    """Perform OCR on the given image with high accuracy"""
    # Check if Tesseract is installed
    if not check_tesseract_installed():
        return []
    
    # Preprocess the image for better OCR results
    processed_image = preprocess_image_for_ocr(image)
    
    try:
        # Try multiple OCR approaches and combine results for better accuracy
        results = []
        
        # Approach 1: Standard OCR with optimized config
        text1 = pytesseract.image_to_string(
            processed_image, 
            config='--psm 6 --oem 3 -c preserve_interword_spaces=1'
        )
        results.extend(extract_ingredients_from_ocr_text(text1))
        
        # Approach 2: Different page segmentation mode for lists
        text2 = pytesseract.image_to_string(
            processed_image, 
            config='--psm 4 --oem 3 -c preserve_interword_spaces=1'
        )
        results.extend(extract_ingredients_from_ocr_text(text2))
        
        # Approach 3: Try with different languages if available
        try:
            text3 = pytesseract.image_to_string(
                processed_image,
                lang='eng+fra+deu+spa',  # Try multiple languages
                config='--psm 6 --oem 3'
            )
            results.extend(extract_ingredients_from_ocr_text(text3))
        except:
            # If multi-language fails, continue with what we have
            pass
        
        # Remove duplicates while preserving order
        unique_results = []
        seen = set()
        for item in results:
            normalized = re.sub(r'\s+', ' ', item.lower()).strip()
            if normalized not in seen and len(normalized) > 2:
                seen.add(normalized)
                unique_results.append(item)
        
        return unique_results
    except pytesseract.TesseractNotFoundError:
        print("⚠️ Error: Tesseract OCR executable not found.")
        return []
    except Exception as e:
        print(f"⚠️ OCR Error: {e}")
        return []

def process_ingredient_image_url(url, deadline_ts):
    """Process an ingredient image URL to extract ingredients using OCR"""
    if not url or time.monotonic() >= deadline_ts:
        return []
    
    try:
        # Download the image
        response = requests.get(url, headers=UA, timeout=(CONNECT_TIMEOUT, READ_TIMEOUT))
        if not response.ok:
            return []
        
        # Open the image from binary data
        image = Image.open(io.BytesIO(response.content))
        
        # Perform OCR and extract ingredients
        return perform_ocr_on_image(image)
    except Exception as e:
        print(f"⚠️ Error processing ingredient image: {e}")
        return []

def process_local_image(image_path, deadline_ts):
    """Process a local image file to extract ingredients using OCR"""
    if not image_path or not os.path.exists(image_path) or time.monotonic() >= deadline_ts:
        return []
    
    try:
        # Open the image file
        image = Image.open(image_path)
        
        # Perform OCR and extract ingredients
        return perform_ocr_on_image(image)
    except Exception as e:
        print(f"⚠️ Error processing local image: {e}")
        return []

def fetch_one(base: str, barcode: str, deadline_ts: float, fields: str, db_name: str = "OFF"):
    """Fetch product data from a specific database API"""
    # If we're already out of time, bail early
    if time.monotonic() >= deadline_ts:
        return None, None
    try:
        r = requests.get(
            f"{base}/api/v2/product/{barcode}.json",
            params={"fields": fields},
            headers=UA,
            timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
        )
        if not r.ok:
            return None, None
        j = r.json()
        if j.get("status") == 1:
            return j["product"], db_name
        return None, None
    except requests.RequestException:
        return None, None

def ensure_cache_dir():
    """Ensure the cache directory exists"""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

def get_cache_path(barcode: str) -> Path:
    """Get the cache file path for a barcode"""
    return CACHE_DIR / f"{barcode}.json"

def is_cache_valid(cache_path: Path) -> bool:
    """Check if a cache file is valid and not expired"""
    if not cache_path.exists():
        return False
    
    # Check if the cache is too old
    cache_time = datetime.fromtimestamp(cache_path.stat().st_mtime)
    age_days = (datetime.now() - cache_time).days
    return age_days <= CACHE_EXPIRY_DAYS

def get_from_cache(barcode: str) -> tuple:
    """Try to get product data from cache"""
    cache_path = get_cache_path(barcode)
    
    if is_cache_valid(cache_path):
        try:
            with open(cache_path, 'r') as f:
                cache_data = json.load(f)
                return cache_data.get('product'), cache_data.get('source')
        except (json.JSONDecodeError, IOError):
            # If there's any issue with the cache file, ignore it
            pass
    
    return None, None

def save_to_cache(barcode: str, product: dict, source: str):
    """Save product data to cache"""
    ensure_cache_dir()
    cache_path = get_cache_path(barcode)
    
    try:
        cache_data = {
            'product': product,
            'source': source,
            'cached_at': datetime.now().isoformat()
        }
        
        with open(cache_path, 'w') as f:
            json.dump(cache_data, f, indent=2)
    except IOError as e:
        print(f"Warning: Could not save to cache: {e}")

def fetch_from_all_databases(barcode: str, deadline_ts: float):
    """Try to fetch product data from all available databases or cache"""
    # First, try to get from cache
    product, source = get_from_cache(barcode)
    if product:
        print("📦 Found in local cache")
        return product, f"{source} (cached)"
    
    # Define all databases to try
    databases = [
        (OFF_BASES, OFF_FIELDS, "Open Food Facts"),
        (OBF_BASES, OBF_FIELDS, "Open Beauty Facts"),
        (OPFF_BASES, OPFF_FIELDS, "Open Pet Food Facts")
    ]
    
    # Try each database in sequence
    for bases, fields, db_name in databases:
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(bases)) as ex:
            futures = [ex.submit(fetch_one, base, barcode, deadline_ts, fields, db_name) for base in bases]
            for fut in concurrent.futures.as_completed(futures, timeout=max(0.0, deadline_ts - time.monotonic())):
                try:
                    product, source = fut.result(timeout=max(0.0, deadline_ts - time.monotonic()))
                    if product:
                        # Cancel remaining futures to save time
                        for f in futures:
                            f.cancel()
                        
                        # Save to cache for future use
                        save_to_cache(barcode, product, source)
                        
                        return product, source
                except Exception:
                    pass  # ignore timeouts/cancellations
    
    return None, None

def main():
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='IngredientIQ: Extract ingredients from products using barcode or image')
    parser.add_argument('barcode', nargs='?', help='Product barcode (EAN-13)')
    parser.add_argument('-i', '--image', help='Path to an image file containing ingredients list')
    args = parser.parse_args()
    
    # Check if we have either a barcode or an image
    if not args.barcode and not args.image:
        parser.print_help()
        sys.exit(1)
    
    start = time.monotonic()
    deadline = start + GLOBAL_DEADLINE
    
    # Process direct image if provided
    if args.image:
        print(f"🔍 Processing ingredients from image: {args.image}")
        ingredients = process_local_image(args.image, deadline)
        
        if ingredients:
            print("\n✅ Ingredients extracted from image:")
            for i, ing in enumerate(ingredients, 1):
                print(f"{i}. {ing}")
        else:
            print("\n⚠️ Could not extract ingredients from the image.")
        
        elapsed = time.monotonic() - start
        print(f"\n⏱️ Done in {elapsed:.2f}s")
        sys.exit(0)
    
    # Process barcode lookup
    barcode = args.barcode.strip()
    
    # Validate the barcode
    is_valid, reason = validate_ean13(barcode)
    if not is_valid:
        print(f"⚠️ Barcode validation: {reason}")
        print("We'll try to look it up anyway.")

    print(f"🔎 Looking up {barcode} (≤ {GLOBAL_DEADLINE}s)…")

    # Try to fetch from all available databases
    product, source_db = fetch_from_all_databases(barcode, deadline)

    elapsed = time.monotonic() - start
    if not product:
        print(f"❌ Product not found in any database. Took {elapsed:.2f}s.")
        print("\nSuggestions:")
        print("  1. Double-check the barcode number for typos")
        print("  2. Try scanning the barcode again")
        print("  3. Use the -i option to process an image of the ingredients directly:")
        print(f"     python {sys.argv[0]} -i path/to/ingredients_image.jpg")
        print("  4. Enter product information manually")
        
        # Ask if the user wants to enter product information manually
        try:
            manual_entry = input("\nWould you like to enter product information manually? (y/n): ").strip().lower()
            if manual_entry == 'y':
                print("\n--- Manual Product Entry ---")
                product_name = input("Product name: ").strip()
                brand = input("Brand (optional): ").strip()
                ingredients_text = input("Ingredients (comma separated): ").strip()
                
                # Create a synthetic product object
                product = {
                    "code": barcode,
                    "product_name": product_name,
                    "brands": brand,
                    "ingredients_text": ingredients_text,
                    "countries": "Manual Entry"
                }
                source_db = "Manual Entry"
                print("\n✅ Product information saved")
            else:
                print("Exiting.")
                sys.exit(0)
        except KeyboardInterrupt:
            print("\nOperation cancelled.")
            sys.exit(0)
        except Exception as e:
            print(f"\nError during manual entry: {e}")
            sys.exit(1)

    name   = product.get("product_name") or "-"
    brand  = product.get("brands") or "-"
    cntrs  = product.get("countries") or "-"
    raw_tx = (product.get("ingredients_text") or "").strip()
    struct = product.get("ingredients") if isinstance(product.get("ingredients"), list) else None
    ingredient_image_url = product.get("image_ingredients_url")

    print("✅ Product found in", source_db)
    print("Name      :", name)
    print("Brand     :", brand)
    print("Countries :", cntrs)
    
    ingredients_found = False
    
    # First try: Use raw text ingredients if available
    if raw_tx:
        ingredients_found = True
        parsed = split_ingredients(raw_tx)
        print("\nIngredients (parsed from raw text):")
        for i, x in enumerate(parsed, 1):
            print(f"{i}. {x}")
    
    # Second try: Use structured ingredients if available
    elif struct:
        ingredients_found = True
        print("\nIngredients (from OFF structured list):")
        for i, ing in enumerate([x.get("text") for x in struct if x.get("text")], 1):
            print(f"{i}. {ing}")
    
    # Third try: Use OCR on ingredient image if available
    elif ingredient_image_url:
        print(f"\n🔍 Ingredient image found. Attempting OCR...")
        ocr_ingredients = process_ingredient_image_url(ingredient_image_url, deadline)
        
        if ocr_ingredients:
            ingredients_found = True
            print("\nIngredients (extracted from image using OCR):")
            for i, ing in enumerate(ocr_ingredients, 1):
                print(f"{i}. {ing}")
    
    # No ingredients found through any method
    if not ingredients_found:
        print("\n⚠️ No ingredients available for this product.")

    print(f"\n⏱️ Done in {elapsed:.2f}s")

if __name__ == "__main__":
    main()
