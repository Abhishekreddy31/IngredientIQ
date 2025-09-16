#!/usr/bin/env python3
import re

def extract_ingredients_from_ocr_text(text):
    """Process OCR text to extract ingredients with high accuracy
    
    This function identifies ingredient sections in text and extracts complete
    ingredient phrases, preserving parenthetical content like percentages.
    """
    if not text:
        return []
    
    # Clean up the text for better parsing
    text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between camelCase words
    text = text.replace('\n', ' ')  # Replace newlines with spaces
    text = re.sub(r'\s+', ' ', text).strip()  # Normalize spaces
    
    # Try to find the ingredients section using common patterns
    ingredients_section_patterns = [
        # Standard ingredient labels with various formats
        r'(?:ingredients|contains|made with|made from|ingrédients|ingredienti|zutaten|ingredientes)[\s:]*([\w\s\-\/\(\)\[\]\{\}\.,;:&+%*!?]+?)(?=\s*(?:\n\s*\n|\Z|\d+%|\d+\s*%|contains|allergens|may contain|store|keep|best before|nutrition|ingredients|$))',
        # For products that just list ingredients without a header
        r'((?:[\w\s\-\/\(\)\[\]\{\}]+(?:\s*[,;]\s*|\s+and\s+)){2,}[\w\s\-\/\(\)\[\]\{\}]+)'
    ]
    
    # Try to find the main ingredients section
    ingredients_section = ""
    for pattern in ingredients_section_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            ingredients_section = match.group(1).strip() if match.lastindex else match.group(0).strip()
            break
    
    # If no clear section found, use the whole text but clean it up
    if not ingredients_section:
        # Remove common non-ingredient sections
        text = re.sub(r'(?i)(nutrition(?:al)?(?:\s+information)?|allergen(?:\s+information)?|storage(?:\s+instructions)?|best\s+before|packaged\s+in|distributed\s+by|made\s+in|net\s+weight|serving\s+size|per\s+100g?|\d+\s*(?:kcal|kj)|\b(?:energy|fat|saturates|carbohydrates|sugars|protein|salt|fibre)s?\b.*?)(?=\n|$)', ' ', text, flags=re.IGNORECASE)
        ingredients_section = text
    
    # Parse ingredients using comma and semicolon as separators
    # while preserving parenthetical content
    ingredients = split_ingredients(ingredients_section)
    
    # Clean up and filter the ingredients
    filtered_ingredients = []
    non_ingredients = ['nutrition', 'facts', 'serving', 'allergen', 'warning', 'manufactured', 'facility']
    
    for item in ingredients:
        # Clean up the ingredient string
        item = re.sub(r'^[\s\d.\-*]+', '', item)  # Remove leading numbers, bullets, etc.
        item = re.sub(r'\s*[,;]\s*$', '', item)  # Remove trailing commas/semicolons
        item = re.sub(r'\s+', ' ', item).strip()  # Normalize spaces
        
        # Skip if too short or matches common non-ingredient patterns
        if (len(item) >= 3 and 
            not any(non_ing in item.lower() for non_ing in non_ingredients) and
            not re.match(r'^\d+\s*[gml%]?$', item.lower()) and
            not re.match(r'^[\d\s\-*,.]+$', item)):
            filtered_ingredients.append(item)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_ingredients = []
    for ing in filtered_ingredients:
        # Normalize for comparison (lowercase, remove non-word chars)
        normalized = re.sub(r'[^\w\s]', '', ing.lower()).strip()
        if normalized and normalized not in seen and len(normalized) >= 3:
            seen.add(normalized)
            unique_ingredients.append(ing)
    
    return unique_ingredients

def split_ingredients(text):
    """Split text into ingredients while preserving complete phrases
    
    This function handles ingredient lists with various separators (commas, semicolons)
    and preserves parenthetical content within ingredients.
    """
    if not text:
        return []
    
    # Track parentheses depth to avoid splitting inside parenthetical content
    out, buf, depth = [], "", 0
    for ch in text:
        if ch == "(":
            depth += 1
            buf += ch
        elif ch == ")":
            depth = max(0, depth-1)
            buf += ch
        elif ch in [",", ";"] and depth == 0:
            if buf.strip(): 
                out.append(buf.strip())
                buf = ""
        else:
            buf += ch
    
    if buf.strip():
        out.append(buf.strip())
    
    # Clean up each ingredient
    ingredients = []
    for item in out:
        # Normalize whitespace
        item = re.sub(r"\s+", " ", item).strip()
        
        # Skip empty items
        if not item:
            continue
            
        # Handle "and" as a separator when it appears as a standalone word
        if re.search(r'\s+and\s+', item):
            parts = re.split(r'\s+and\s+', item)
            ingredients.extend([p.strip() for p in parts if p.strip()])
        else:
            ingredients.append(item)
    
    return ingredients

# Test function to demonstrate the improved ingredient extraction
def test_extraction():
    test_text = "INGREDIENTS: sugar, vegetable oil, hazelnuts (13%), skim milk powder (8.7%), fat-reduced cocoa (7.4%), emulsifier: lecithin, vanillin."
    ingredients = extract_ingredients_from_ocr_text(test_text)
    print("Extracted ingredients:")
    for i, ing in enumerate(ingredients, 1):
        print(f"{i}. {ing}")
    
    return ingredients

if __name__ == "__main__":
    test_extraction()
