#!/bin/bash

echo "🚀 Setting up BashaLagbe for deployment..."

# Check if backend/.env exists
if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env not found!"
    echo "Please create backend/.env with your environment variables"
    echo "See .env.example for template"
    exit 1
fi

# Copy environment variables
cp backend/.env .env
echo "✅ Environment variables copied"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm run build
cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Test locally: npm start"
echo "2. Check health: http://localhost:5000/api/health"
echo "3. Deploy to Render following DEPLOY_GUIDE.md"
