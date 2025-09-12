# 🚀 MERN App Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables
- [ ] Copy all variables from `.env.example` to your deployment platform
- [ ] Set `NODE_ENV=production`
- [ ] Update `CLIENT_URL` to your frontend deployment URL
- [ ] Ensure `MONGODB_URI` is correct and accessible

### 2. MongoDB Atlas Configuration
- [ ] Go to MongoDB Atlas → Network Access
- [ ] Add IP Address: `0.0.0.0/0` (Allow Access from Anywhere)
- [ ] Or add your deployment platform's IP ranges
- [ ] Verify database user credentials are correct

### 3. Deployment Platform Setup

#### For Render.com:
```bash
# Build Command
npm install

# Start Command
node server.js
```

#### For Railway/Vercel:
```bash
# Install dependencies
npm install

# Start the server
node server.js
```

## Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-app-url.com/api/health
```

### 2. Database Connection
- [ ] Check deployment logs for MongoDB connection success
- [ ] Verify no "buffering timed out" errors

### 3. CORS Configuration
- [ ] Test login/register from frontend
- [ ] Check browser console for CORS errors
- [ ] Verify API calls work from deployed frontend

### 4. Environment Variables Checklist
- [ ] `MONGODB_URI` - MongoDB Atlas connection string
- [ ] `JWT_SECRET` - Secure random string (min 32 chars)
- [ ] `CLIENT_URL` - Your frontend deployment URL
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Usually 5000 (or let platform assign)
- [ ] `CLOUDINARY_*` - If using file uploads

## Common Issues & Solutions

### Issue: "Mongo query buffering timed out after 10000ms"
**Solution:**
- ✅ Updated MongoDB connection with longer timeouts
- ✅ Added retry logic for connection failures
- ✅ Check MongoDB Atlas Network Access settings

### Issue: CORS errors in production
**Solution:**
- ✅ Updated CORS to dynamically allow frontend URLs
- ✅ Added support for multiple domains via `ALLOWED_DOMAINS`
- ✅ Ensure `CLIENT_URL` matches your frontend deployment

### Issue: Login/Register not working
**Solution:**
- ✅ Verify JWT_SECRET is set in production
- ✅ Check MongoDB connection is working
- ✅ Ensure CORS allows frontend domain
- ✅ Test API endpoints directly

## Testing Commands

```bash
# Test health endpoint
curl https://your-app-url.com/api/health

# Test login endpoint
curl -X POST https://your-app-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test database connection
curl https://your-app-url.com/api/_debug/db
```

## Deployment Platforms

### Render.com
1. Connect GitHub repository
2. Set environment variables
3. Set build command: `npm install`
4. Set start command: `node server.js`
5. Deploy

### Railway
1. Connect GitHub repository
2. Environment variables are auto-detected from `.env`
3. Deploy automatically

### Vercel (for full-stack)
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Configure build settings
4. Deploy

## Monitoring & Debugging

### Check Logs
- [ ] Deployment platform logs
- [ ] MongoDB Atlas connection logs
- [ ] Browser console for frontend errors

### Performance Monitoring
- [ ] Response times for API calls
- [ ] Database query performance
- [ ] Memory usage

## Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] MongoDB credentials are not exposed
- [ ] CORS only allows necessary domains
- [ ] HTTPS is enabled
- [ ] Sensitive data is not logged

---

✅ **All deployment issues have been addressed!**
