#!/bin/bash

# IngredientIQ Backend Starter Script
echo "🚀 Starting IngredientIQ Backend on port 5000..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
  source venv/bin/activate
fi

# Install dependencies if needed
if [ "$1" == "--install" ]; then
  echo "📦 Installing Python dependencies..."
  pip install -r requirements.txt
fi

# Start the Flask backend
python app.py
