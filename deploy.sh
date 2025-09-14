#!/bin/bash

# IngredientIQ Deployment Script
echo "🚀 Deploying IngredientIQ application..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and try again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Build the application
echo "📦 Building application..."
./build.sh

# Build and start Docker containers
echo "🐳 Building and starting Docker containers..."
docker-compose up --build -d

# Check if containers are running
if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
    echo "🌐 Application is now running at http://localhost:5000"
else
    echo "❌ Deployment failed. Please check the logs for more information."
    exit 1
fi

# Show logs
echo "📋 Container logs (press Ctrl+C to exit):"
docker-compose logs -f
