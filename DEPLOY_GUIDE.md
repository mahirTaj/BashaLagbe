# BashaLagbe Deployment Guide

## 🚀 Quick Deploy to Render

### Prerequisites
1. GitHub repository with your code
2. MongoDB Atlas database
3. Render account (free)

### Step-by-Step Deployment

#### 1. Environment Setup
Copy your environment variables:
```bash
cp backend/.env .env
```

Make sure your `.env` file contains:
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=10000
TRUST_PROXY=true
DISABLE_CSP=true
```

#### 2. Test Build Locally
```bash
npm run setup
npm run render-build
npm start
```

#### 3. Deploy to Render

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: `bashalagbe` (or your preferred name)
   - **Runtime**: `Node`
   - **Build Command**: `npm run render-build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

3. **Environment Variables**
   Add these in Render dashboard:
   ```
   MONGO_URI = mongodb+srv://...
   JWT_SECRET = your-secret-key
   NODE_ENV = production
   PORT = 10000
   TRUST_PROXY = true
   DISABLE_CSP = true
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete (5-10 minutes)
   - Your app will be available at `https://your-service-name.onrender.com`

### Alternative: One-Click Deploy

Use the render.yaml file for automatic configuration:

1. Push your code to GitHub
2. Go to Render Dashboard
3. Click "New +" → "Blueprint"
4. Connect repository and deploy

### Troubleshooting

#### Build Fails
- Check that all dependencies are in package.json
- Ensure frontend builds successfully: `cd frontend && npm run build`

#### Environment Variables
- MongoDB URI must be accessible from Render IPs
- Check MongoDB Atlas Network Access (allow all IPs: 0.0.0.0/0)
- Verify connection string format

#### App Not Loading
- Check `/api/health` endpoint
- Review Render logs for errors
- Ensure frontend build exists

### Health Check
Your app includes a health endpoint at `/api/health` that shows:
- Database connection status
- Environment info
- Build status

### Free Tier Limitations
- App sleeps after 15 minutes of inactivity
- 750 hours/month (sufficient for personal projects)
- Cold start delay (30-60 seconds) after sleep

## 🛠️ Development

### Local Development
```bash
npm run setup
npm run dev
```

### Build for Production
```bash
npm run render-build
```

### Test Production Build
```bash
npm start
```

## 📁 Project Structure
```
/
├── server.js              # Main server file
├── package.json           # Root dependencies & scripts
├── render.yaml            # Render deployment config
├── .env                   # Environment variables
├── backend/               # Express API
├── frontend/              # React app
└── frontend/build/        # Production build (generated)
```

## 🔐 Security Features
- CORS protection
- Helmet security headers
- Rate limiting
- Input validation
- Environment-based configuration

## 📊 Monitoring
- Health check endpoint: `/api/health`
- Request logging with Morgan
- Error handling with stack traces (dev only)
- Graceful shutdown handling
