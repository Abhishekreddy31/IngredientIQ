#!/bin/bash

# IngredientIQ Combined Starter Script
echo "🚀 Starting IngredientIQ Application..."
echo "This script will start both the backend and frontend in separate terminal windows."

# Check if the terminal supports tabs/windows
if [ -x "$(command -v osascript)" ]; then
  # macOS - Use AppleScript to open new terminal windows
  echo "📱 Starting Backend (port 5000)..."
  osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && ./start-backend.sh"'
  
  echo "🖥️ Starting Frontend (port 5173)..."
  osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && ./start-frontend.sh"'
  
  echo "✅ Application started successfully!"
  echo "🌐 Backend: http://localhost:5000"
  echo "🌐 Frontend: http://localhost:5173"
else
  # Fallback for other systems
  echo "⚠️ Unable to open multiple terminal windows automatically."
  echo "Please run these commands in separate terminals:"
  echo "  ./start-backend.sh"
  echo "  ./start-frontend.sh"
fi
