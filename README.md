# IngredientIQ

<p align="center">
  <img src="static/img/logo.svg" alt="IngredientIQ Logo" width="200">
</p>

<p align="center">
  <strong>Know what's in your food, cosmetics, and pet products</strong>
</p>

IngredientIQ is a modern, cross-platform web application that helps users discover what's in their everyday products. It provides multiple ways to extract ingredient information:

1. **Barcode Lookup**: Search products using their barcode
2. **Camera Scanning**: Scan barcodes directly using your device camera
3. **Image OCR**: Extract ingredients from images of product packaging
4. **Ingredient Analysis**: Analyze ingredients for health benefits and concerns

## 🌟 Features

- **Cross-Platform Compatibility**: Works seamlessly on both mobile and desktop devices
- **Multiple Data Sources**: Connects to Open Food Facts, Open Beauty Facts, and Open Pet Food Facts
- **Advanced OCR**: Extracts ingredients from images with high accuracy
- **Real-time Barcode Scanning**: Uses device camera for instant product lookup
- **Ingredient Health Analysis**: Evaluates ingredients for health benefits and potential concerns
- **Responsive UI**: Professional, modern interface built with Material UI and TypeScript
- **Local Caching**: Faster repeat lookups with intelligent caching
- **Manual Product Entry**: Contribute to the database when products aren't found
- **RESTful API**: Well-documented API endpoints for integration with other applications

## 🛠️ Technology Stack

### Backend
- Python 3.9+
- Flask (Web framework)
- Tesseract OCR (Optical Character Recognition)
- Spoonacular API (Ingredient Analysis)
- Docker & Docker Compose (Containerization)

### Frontend
- TypeScript
- React 18
- Material UI 5
- Axios (API client)
- React Router (Navigation)

## 📋 Requirements

- Python 3.9+
- Node.js 16+
- Tesseract OCR
- Docker & Docker Compose (for deployment)

## 🚀 Installation

### Quick Start (Using Scripts)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/IngredientIQ.git
   cd IngredientIQ
   ```

2. Run the build script:
   ```bash
   ./build.sh
   ```

3. Start the application:
   ```bash
   python app.py
   ```

4. Access the application at http://localhost:5000

### Manual Setup

#### Backend Setup

1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Install Tesseract OCR:
   - **macOS**: `brew install tesseract tesseract-lang`
   - **Linux**: `sudo apt-get install tesseract-ocr tesseract-ocr-eng`
   - **Windows**: Download installer from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Spoonacular API key (get one from [Spoonacular](https://spoonacular.com/food-api)):
     ```
     SPOONACULAR_API_KEY=your_api_key_here
     ```

#### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Build the frontend:
   ```bash
   npm run build
   ```

## 🐳 Docker Deployment

1. Build and run using Docker Compose:
   ```bash
   ./deploy.sh
   ```
   or manually:
   ```bash
   docker-compose up --build -d
   ```

2. Access the application at http://localhost:5000

## 🔍 Usage

### Barcode Search
Enter a product barcode in the search field and click "Search" to find product information and ingredients.

### Camera Scanning
Click on the "Scan" tab, then click "Start Camera" to activate your device's camera. Point it at a barcode to scan.

### Image OCR
Upload an image of a product's ingredient list or take a photo using your device camera to extract ingredients.

### Ingredient Analysis
After finding a product or extracting ingredients, click the "Analyze Ingredients" button to get detailed health information about each ingredient, including:
- Safety ratings (safe, caution, avoid)
- Health benefits
- Potential concerns
- Nutritional information

## 🌐 API Documentation

IngredientIQ provides a RESTful API for integration with other applications.

### Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/search` - Search for a product by barcode
- `POST /api/ocr` - Extract ingredients from an image
- `POST /api/product/manual` - Manually add a product
- `POST /api/analyze-ingredients` - Analyze a list of ingredients for health information

### Example Request

```bash
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"barcode": "5000112637922"}'
```

### Ingredient Analysis Example

```bash
curl -X POST http://localhost:5000/api/analyze-ingredients \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["sugar", "salt", "olive oil", "flour"]}'

```

## 📱 Mobile Application

The frontend is designed to be compatible with mobile application frameworks like React Native. The API endpoints can be used to build native mobile applications.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

If you have any questions or feedback, please open an issue on GitHub.
