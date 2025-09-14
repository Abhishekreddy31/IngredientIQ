#!/usr/bin/env python3
import os
import json
import tempfile
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import functionality from fast_lookup.py
from fast_lookup import (
    validate_ean13, 
    fetch_from_all_databases, 
    process_local_image,
    split_ingredients,
    GLOBAL_DEADLINE,
    check_tesseract_installed,
    ean13_hint
)
import time

# Initialize Flask app
app = Flask(__name__, static_folder='static')

# Configure CORS to allow requests from frontend
CORS(app, resources={r"/api/*": {
    "origins": "http://localhost:5173",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})

# Set secret key for session
app.secret_key = os.urandom(24)

# Configure upload folder
UPLOAD_FOLDER = Path('static/uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Ensure upload directory exists
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """Serve React frontend for all routes except /api"""
    if path.startswith('api/'):
        # Let the API routes handle these requests
        return jsonify({'error': 'Not found'}), 404
        
    # Check if the path exists in the frontend build directory
    if path and os.path.exists(os.path.join(app.static_folder, 'frontend', path)):
        return send_from_directory(os.path.join(app.static_folder, 'frontend'), path)
    
    # For all other routes, serve the React index.html
    return send_from_directory(os.path.join(app.static_folder, 'frontend'), 'index.html')

@app.route('/api/health')
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check if Tesseract is available
        if not check_tesseract_installed():
            return jsonify({
                'status': 'error',
                'message': 'Tesseract OCR not found',
                'tesseract_installed': False
            }), 500
            
        return jsonify({
            'status': 'ok',
            'tesseract_installed': True,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'tesseract_installed': False
        }), 500

@app.route('/search', methods=['POST'])
def search():
    """Handle barcode search (HTML form submission)"""
    barcode = request.form.get('barcode', '').strip()
    
    if not barcode:
        return jsonify({
            'success': False,
            'error': 'No barcode provided'
        }), 400
    
    # Validate barcode
    is_valid, reason = validate_ean13(barcode)
    if not is_valid:
        return jsonify({
            'success': False,
            'error': f'Invalid barcode: {reason}'
        }), 400
    
    # Start timing
    start = time.monotonic()
    deadline = start + GLOBAL_DEADLINE
    
    # Try to fetch product from databases
    product, source_db = fetch_from_all_databases(barcode, deadline)
    
    elapsed = time.monotonic() - start
    
    if not product:
        return jsonify({
            'success': False,
            'error': f'Product with barcode {barcode} not found',
            'barcode': barcode
        }), 404
    
    # Extract product information
    name = product.get("product_name") or "-"
    brand = product.get("brands") or "-"
    countries = product.get("countries") or "-"
    raw_text = (product.get("ingredients_text") or "").strip()
    structured = product.get("ingredients") if isinstance(product.get("ingredients"), list) else None
    ingredient_image_url = product.get("image_ingredients_url")
    
    # Process ingredients
    ingredients = []
    ingredients_source = None
    
    if raw_text:
        ingredients = split_ingredients(raw_text)
        ingredients_source = "text"
    elif structured:
        ingredients = [x.get("text") for x in structured if x.get("text")]
        ingredients_source = "structured"
    elif ingredient_image_url:
        # We'll handle OCR in a separate route
        pass
    
    return jsonify({
        'success': True,
        'barcode': barcode,
        'name': name,
        'brand': brand,
        'countries': countries,
        'ingredients': ingredients,
        'ingredients_source': ingredients_source,
        'ingredient_image_url': ingredient_image_url,
        'source_db': source_db,
        'elapsed': elapsed
    })

@app.route('/api/search', methods=['POST'])
def api_search():
    """API endpoint for barcode search"""
    # Get JSON data or form data
    if request.is_json:
        data = request.get_json()
        barcode = data.get('barcode', '').strip()
    else:
        barcode = request.form.get('barcode', '').strip()
    
    if not barcode:
        return jsonify({
            'success': False,
            'error': 'No barcode provided'
        }), 400
    
    # Validate barcode
    is_valid, reason = validate_ean13(barcode)
    if not is_valid:
        return jsonify({
            'success': False,
            'error': f'Invalid barcode: {reason}'
        }), 400
    
    # Start timing
    start = time.monotonic()
    deadline = start + GLOBAL_DEADLINE
    
    # Try to fetch product from databases
    product, source_db = fetch_from_all_databases(barcode, deadline)
    
    elapsed = time.monotonic() - start
    
    if not product:
        return jsonify({
            'success': False,
            'error': f'Product with barcode {barcode} not found',
            'barcode': barcode
        }), 404
    
    # Extract product information
    name = product.get("product_name") or "-"
    brand = product.get("brands") or "-"
    countries = product.get("countries") or "-"
    raw_text = (product.get("ingredients_text") or "").strip()
    structured = product.get("ingredients") if isinstance(product.get("ingredients"), list) else None
    ingredient_image_url = product.get("image_ingredients_url")
    
    # Process ingredients
    ingredients = []
    ingredients_source = None
    
    if raw_text:
        ingredients = split_ingredients(raw_text)
        ingredients_source = "text"
    elif structured:
        ingredients = [x.get("text") for x in structured if x.get("text")]
        ingredients_source = "structured"
    elif ingredient_image_url:
        # We'll handle OCR in a separate route
        pass
    
    return jsonify({
        'success': True,
        'barcode': barcode,
        'name': name,
        'brand': brand,
        'countries': countries,
        'ingredients': ingredients,
        'ingredients_source': ingredients_source,
        'ingredient_image_url': ingredient_image_url,
        'source_db': source_db,
        'elapsed': elapsed
    })

@app.route('/ocr', methods=['GET', 'POST'])
def ocr():
    """Handle OCR processing (HTML form submission)"""
    if request.method == 'POST':
        # Check if Tesseract is installed
        tesseract_installed = check_tesseract_installed()
        if not tesseract_installed:
            return jsonify({
                'success': False,
                'error': 'Tesseract OCR is not installed on the server',
                'tesseract_installed': False
            }), 500
        
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file part in the request'
            }), 400
        
        file = request.files['file']
        
        # If user does not select file, browser also submits an empty part without filename
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No selected file'
            }), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Start timing
            start = time.monotonic()
            deadline = start + GLOBAL_DEADLINE
            
            # Process the image with OCR
            ingredients = process_local_image(filepath, deadline)
            
            # Calculate processing time
            elapsed = time.monotonic() - start
            
            return jsonify({
                'success': True,
                'ingredients': ingredients,
                'processing_time': elapsed,
                'image_path': filename
            })
    
    return jsonify({
        'success': False,
        'error': 'Invalid request method'
    }), 400

@app.route('/api/ocr/result', methods=['GET'])
def api_ocr_result():
    """API endpoint to get OCR results by image path"""
    image_path = request.args.get('image_path')
    if not image_path:
        return jsonify({
            'success': False,
            'error': 'No image path provided'
        }), 400
    
    # In a real app, we would fetch the OCR results from a database
    # For now, we'll simulate by extracting ingredients from the image again
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], image_path)
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'error': 'Image not found'
            }), 404
        
        # Start timing
        start = time.monotonic()
        deadline = start + GLOBAL_DEADLINE
        
        # Process the image with OCR
        ingredients = process_local_image(filepath, deadline)
        
        # Calculate processing time
        elapsed = time.monotonic() - start
        
        return jsonify({
            'success': True,
            'ingredients': ingredients,
            'processing_time': elapsed,
            'image_path': image_path
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ocr', methods=['POST'])
@app.route('/ocr', methods=['POST'])
def api_ocr():
    """API endpoint for OCR processing"""
    # Check if Tesseract is installed
    if not check_tesseract_installed():
        return jsonify({
            'success': False,
            'error': 'Tesseract OCR is not installed on the server',
            'tesseract_installed': False
        }), 500
    
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'error': 'No file part in the request'
        }), 400
    
    file = request.files['file']
    
    # If user does not select file, browser also submits an empty part without filename
    if file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No selected file'
        }), 400
    
    if file and allowed_file(file.filename):
        # Create a secure filename and save the file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Start timing
        start = time.monotonic()
        deadline = start + GLOBAL_DEADLINE
        
        # Process the image with OCR
        ingredients = process_local_image(filepath, deadline)
        
        # Calculate processing time
        elapsed = time.monotonic() - start
        
        # Return the results
        return jsonify({
            'success': True,
            'ingredients': ingredients,
            'processing_time': elapsed,
            'image_path': filename
        })
    
    return jsonify({
        'success': False,
        'error': 'File type not allowed'
    }), 400

@app.route('/ocr_url', methods=['POST'])
def ocr_url():
    """Process OCR on an ingredient image URL"""
    url = request.form.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    
    # This would be implemented to process the URL image
    # For now, we'll just return a placeholder
    return jsonify({'status': 'not_implemented'})

@app.route('/api/product/manual', methods=['POST'])
def api_manual_product():
    """API endpoint for manual product entry"""
    # Get JSON data or form data
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form
    
    # Validate required fields
    required_fields = ['barcode', 'name', 'ingredients']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400
    
    # Extract data
    barcode = data.get('barcode').strip()
    name = data.get('name').strip()
    brand = data.get('brand', '').strip()
    ingredients_text = data.get('ingredients').strip()
    
    # Validate barcode
    is_valid, reason = validate_ean13(barcode)
    if not is_valid:
        return jsonify({
            'success': False,
            'error': f'Invalid barcode: {reason}'
        }), 400
    
    # Process ingredients
    ingredients = split_ingredients(ingredients_text)
    
    # Create product object
    product = {
        'code': barcode,
        'product_name': name,
        'brands': brand,
        'ingredients_text': ingredients_text,
        'ingredients': ingredients,
        'countries': data.get('countries', ''),
        'manually_added': True,
        'added_timestamp': datetime.utcnow().isoformat()
    }
    
    # In a real application, we would save this to a database
    # For now, we'll just return the product
    
    return jsonify({
        'success': True,
        'product': product,
        'message': 'Product added successfully'
    })

# Legacy route removed - using React frontend
if __name__ == '__main__':
    print("🚀 Starting IngredientIQ backend server on port 5000")
    print("📝 API endpoints available at http://localhost:5000/api")
    print("🔌 Frontend should connect from http://localhost:5173")
    app.run(debug=True, host='0.0.0.0', port=5000)
