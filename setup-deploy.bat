@echo off
echo 🚀 Setting up BashaLagbe for deployment...

REM Check if backend/.env exists
if not exist "backend\.env" (
    echo ❌ backend/.env not found!
    echo Please create backend/.env with your environment variables
    echo See .env.example for template
    pause
    exit /b 1
)

REM Copy environment variables
copy "backend\.env" ".env" >nul
echo ✅ Environment variables copied

REM Install root dependencies
echo 📦 Installing root dependencies...
npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install
cd ..

REM Build frontend
echo 🏗️ Building frontend...
cd frontend
npm run build
cd ..

echo ✅ Setup complete!
echo 
echo Next steps:
echo 1. Test locally: npm start
echo 2. Check health: http://localhost:5000/api/health
echo 3. Deploy to Render following DEPLOY_GUIDE.md
echo 
pause
