#!/bin/bash

# IngredientIQ Frontend Starter Script
echo "🚀 Starting IngredientIQ Frontend on port 5173..."

# Navigate to frontend directory
cd frontend

# Install dependencies if needed
if [ "$1" == "--install" ]; then
  echo "📦 Installing Node.js dependencies..."
  npm install
fi

# Start the React development server
npm start
