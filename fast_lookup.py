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
    from PIL import ImageEnhance, ImageFilter, ImageOps
    import numpy as np
    
    # Convert to grayscale if it's not already
    if image.mode != 'L':
        image = image.convert('L')
    
    # Create a copy of the image for processing
    processed = image.copy()
    
    try:
        # 1. Apply noise reduction
        processed = processed.filter(ImageFilter.MedianFilter(size=3))
        
        # 2. Adaptive thresholding for better text contrast
        # First, enhance contrast with CLAHE (Contrast Limited Adaptive Histogram Equalization)
        img_array = np.array(processed)
        
        # Apply CLAHE using OpenCV if available
        try:
            import cv2
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            img_array = clahe.apply(img_array)
            processed = Image.fromarray(img_array)
        except ImportError:
            # Fallback to PIL's contrast stretching
            processed = ImageOps.autocontrast(processed, cutoff=1)
        
        # 3. Apply unsharp mask to enhance edges
        processed = processed.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
        
        # 4. Apply bilateral filter to reduce noise while preserving edges
        try:
            import cv2
            img_array = np.array(processed)
            img_array = cv2.bilateralFilter(img_array, 9, 75, 75)
            processed = Image.fromarray(img_array)
        except ImportError:
            # Fallback to median filter
            processed = processed.filter(ImageFilter.MedianFilter(size=3))
        
        # 5. Apply adaptive thresholding
        try:
            import cv2
            img_array = np.array(processed)
            img_array = cv2.adaptiveThreshold(
                img_array, 255, 
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            processed = Image.fromarray(img_array)
        except ImportError:
            # Fallback to global thresholding
            processed = processed.point(lambda p: 255 if p > 150 else 0)
        
        # 6. Resize for optimal OCR performance (minimum 300 DPI equivalent)
        min_dpi = 300
        min_width = int(8.27 * min_dpi)  # A4 width at 300 DPI
        min_height = int(11.69 * min_dpi)  # A4 height at 300 DPI
        
        if processed.width < min_width or processed.height < min_height:
            ratio = max(min_width/processed.width, min_height/processed.height)
            new_width = int(processed.width * ratio)
            new_height = int(processed.height * ratio)
            processed = processed.resize((new_width, new_height), Image.LANCZOS)
        
        # 7. Final sharpening
        enhancer = ImageEnhance.Sharpness(processed)
        processed = enhancer.enhance(2.0)
        
        # 8. Final contrast enhancement
        enhancer = ImageEnhance.Contrast(processed)
        processed = enhancer.enhance(1.5)
        
        return processed
        
    except Exception as e:
        print(f"⚠️ Image preprocessing error: {e}")
        # Fall back to basic processing if advanced processing fails
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        return image

def extract_ingredients_from_ocr_text(text):
    """Process OCR text to extract ingredients with high accuracy"""
    if not text:
        return []
    
    # Clean up the text - preserve line breaks for better parsing
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
    text = re.sub(r'([a-z])([A-Z])', r'\1. \2', text)  # Add space between camelCase words
    text = text.replace('\n', ' ')  # Replace newlines with spaces
    text = re.sub(r'\s+', ' ', text).strip()  # Normalize spaces
    
    # Common patterns to identify ingredient sections
    patterns = [
        # Standard ingredient labels with various formats
        r'(?:ingredients|contains|made with|made from|ingrédients|ingredienti|zutaten|ingredientes)[\s:]*([\w\s\-\/\(\)\[\]\{\}\.,;:&+%*!?]+?)(?=\s*(?:\n\s*\n|\Z|\d+%|\d+\s*%|contains|allergens|may contain|store|keep|best before|nutrition|ingredients|$))',
        # For lists that might use numbers or bullets
        r'(?:\d+[.)]?\s*)?([A-Z][\w\s\-\/\+&%]+?)(?=\s*\d+[.)]?\s*[A-Z]|\s*\n|\s*$|\s*\d+%|\s*\()',
        # For ingredients separated by commas/semicolons
        r'((?:[\w\s\-\/\+&%]+(?:\s*[,\*]?\s*|\s+and\s+|\s*\+\s*|\s*&\s*|\s*\|\s*|\s*;\s*)){2,})',
        # For ingredients with percentages
        r'([\w\s\-\/\+&%]+?\s*\d+\s*%)',
        # Catch-all for remaining text that might be ingredients
        r'([A-Z][\w\s\-\/\+&%]+?)(?=\s*\n|\s*$|\s*\d+%|\s*\()'
    ]
    
    # Try to find the main ingredients section first
    ingredients_section = ""
    for pattern in patterns[:2]:  # First two patterns are for section detection
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            ingredients_section = match.group(1).strip() if match.lastindex else match.group(0).strip()
            break
    
    # If no clear section found, use the whole text but clean it up
    if not ingredients_section:
        # Remove common non-ingredient sections
        text = re.sub(r'(?i)(nutrition(?:al)?(?:\s+information)?|allergen(?:\s+information)?|storage(?:\s+instructions)?|best\s+before|packaged\s+in|distributed\s+by|made\s+in|net\s+weight|serving\s+size|per\s+100g?|\d+\s*(?:kcal|kj)|\b(?:energy|fat|saturates|carbohydrates|sugars|protein|salt|fibre)s?\b.*?)(?=\n|$)', ' ', text, flags=re.IGNORECASE)
        ingredients_section = text
    
    # Extract individual ingredients using all patterns
    all_ingredients = []
    for pattern in patterns[1:]:  # Skip the first pattern as we already used it
        matches = re.finditer(pattern, ingredients_section, re.IGNORECASE | re.DOTALL)
        for match in matches:
            # Get the first non-empty group
            ingredient = next((g for g in match.groups() if g), match.group(0))
            if ingredient:
                # Clean up the ingredient string
                ingredient = re.sub(r'^[\s\d.\-*]+', '', ingredient)  # Remove leading numbers, bullets, etc.
                ingredient = re.sub(r'\s*[,\*]\s*$', '', ingredient)  # Remove trailing commas/asterisks
                ingredient = re.sub(r'\s+', ' ', ingredient).strip()  # Normalize spaces
                
                # Skip if too short or matches common non-ingredient patterns
                if (len(ingredient) >= 3 and 
                    not any(non_ing in ingredient.lower() 
                           for non_ing in ['nutrition', 'ingredients', 'allergen', 'warning', 'manufactured', 'facility', 'contains', 'may contain', 'free from']) and
                    not re.match(r'^\d+\s*[gml%]?$', ingredient.lower()) and
                    not re.match(r'^[\d\s\-*,.]+$', ingredient)):
                    all_ingredients.append(ingredient.strip())
    
    # Remove duplicates while preserving order
    seen = set()
    unique_ingredients = []
    for ing in all_ingredients:
        # Normalize for comparison (lowercase, remove non-word chars)
        normalized = re.sub(r'[^\w\s]', '', ing.lower()).strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique_ingredients.append(ing)
    
    return unique_ingredients

def perform_ocr_on_image(image):
    """Perform OCR on the given image with high accuracy and multiple configurations"""
    if not check_tesseract_installed():
        return []
    
    processed_image = preprocess_image_for_ocr(image)
    
    try:
        results = []
        
        # List of OCR configurations to try
        ocr_configs = [
            # Standard configurations
            {'psm': 6, 'oem': 3, 'config': '--oem 3 --psm 6 -c preserve_interword_spaces=1'},
            # Try different page segmentation modes
            {'psm': 4, 'oem': 3, 'config': '--oem 3 --psm 4 -c preserve_interword_spaces=1'},  # Assume a single column of text
            {'psm': 11, 'oem': 3, 'config': '--oem 3 --psm 11'},  # Sparse text
            # Try with different languages
            {'psm': 6, 'oem': 3, 'lang': 'eng+fra+deu+spa', 'config': '--oem 3 --psm 6 -c preserve_interword_spaces=1'},
            # Try with different OEM (OCR Engine Mode)
            {'psm': 6, 'oem': 1, 'config': '--oem 1 --psm 6'},  # Legacy engine only
        ]
        
        for config in ocr_configs:
            try:
                text = pytesseract.image_to_string(
                    processed_image,
                    lang=config.get('lang', 'eng'),
                    config=config['config']
                )
                if text.strip():
                    results.extend(extract_ingredients_from_ocr_text(text))
            except Exception as e:
                print(f"⚠️ OCR config {config} failed: {e}")
                continue
        
        # Also try with different preprocessing
        try:
            # Try with adaptive thresholding
            from PIL import ImageFilter
            thresholded = processed_image.filter(ImageFilter.EDGE_ENHANCE)
            text = pytesseract.image_to_string(
                thresholded,
                config='--psm 6 --oem 3 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%(),.-;: ',
                lang='eng'
            )
            if text.strip():
                results.extend(extract_ingredients_from_ocr_text(text))
        except Exception as e:
            print(f"⚠️ Additional OCR processing failed: {e}")
        
        # Deduplicate results while preserving order
        unique_results = []
        seen = set()
        for item in results:
            # More aggressive normalization
            normalized = re.sub(r'[^\w\s]', '', item.lower()).strip()
            if (normalized and 
                len(normalized) > 2 and 
                not any(non_ing in normalized for non_ing in ['nutrition', 'ingredients', 'allergen', 'warning']) and
                normalized not in seen):
                seen.add(normalized)
                unique_results.append(item)
        
        return unique_results
    except pytesseract.TesseractNotFoundError:
        print("⚠️ Error: Tesseract OCR executable not found.")
        return []
    except Exception as e:
        print(f"⚠️ OCR Error: {e}")
        return []
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
