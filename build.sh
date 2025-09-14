#!/bin/bash

# IngredientIQ Build Script
echo "🚀 Building IngredientIQ application..."

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Build frontend
echo "🏗️  Building React TypeScript frontend..."
cd frontend
npm run build
cd ..

# Create a directory for frontend build in Flask static folder
echo "🔄 Copying frontend build to Flask static folder..."
rm -rf static/frontend
mkdir -p static/frontend
cp -r frontend/build/* static/frontend/

# Install Python dependencies
echo "📦 Installing Python dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p static/uploads

echo "✅ Build completed successfully!"
echo ""
echo "🌐 To run the application:"
echo "   - Development mode: python app.py"
echo "   - Production mode: docker-compose up -d"
