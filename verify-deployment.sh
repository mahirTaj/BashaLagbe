#!/bin/bash

# Deployment Verification Script for Basha Lagbe
# Run this after deployment to verify everything is working

echo "🚀 Starting deployment verification..."

# Check if URL is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <deployment-url>"
    echo "Example: $0 https://bashalagbe.onrender.com"
    exit 1
fi

DEPLOY_URL=$1
API_URL="$DEPLOY_URL/api"

echo "📍 Testing deployment at: $DEPLOY_URL"
echo "🔗 API endpoint: $API_URL"

# Test 1: Health Check
echo ""
echo "1️⃣ Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health check passed (HTTP $HEALTH_RESPONSE)"
else
    echo "❌ Health check failed (HTTP $HEALTH_RESPONSE)"
fi

# Test 2: Database Connection
echo ""
echo "2️⃣ Testing Database Connection..."
DB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/_debug/db")
if [ "$DB_RESPONSE" = "200" ]; then
    echo "✅ Database connection test passed (HTTP $DB_RESPONSE)"
else
    echo "❌ Database connection test failed (HTTP $DB_RESPONSE)"
    echo "   This might indicate MongoDB connection issues"
fi

# Test 3: CORS Headers
echo ""
echo "3️⃣ Testing CORS Configuration..."
CORS_RESPONSE=$(curl -s -I -H "Origin: $DEPLOY_URL" "$API_URL/health" | grep -i "access-control-allow-origin")
if [ -n "$CORS_RESPONSE" ]; then
    echo "✅ CORS headers detected: $CORS_RESPONSE"
else
    echo "❌ CORS headers not found - check CORS configuration"
fi

# Test 4: Auth Endpoint
echo ""
echo "4️⃣ Testing Auth Endpoint Accessibility..."
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API_URL/auth/login")
if [ "$AUTH_RESPONSE" = "200" ] || [ "$AUTH_RESPONSE" = "204" ]; then
    echo "✅ Auth endpoint accessible (HTTP $AUTH_RESPONSE)"
else
    echo "❌ Auth endpoint not accessible (HTTP $AUTH_RESPONSE)"
fi

# Test 5: Listings Endpoint
echo ""
echo "5️⃣ Testing Listings Endpoint..."
LISTINGS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/listings")
if [ "$LISTINGS_RESPONSE" = "200" ]; then
    echo "✅ Listings endpoint working (HTTP $LISTINGS_RESPONSE)"
else
    echo "❌ Listings endpoint failed (HTTP $LISTINGS_RESPONSE)"
fi

echo ""
echo "🎯 Verification complete!"
echo ""
echo "📋 Next Steps:"
echo "1. If any tests failed, check deployment logs"
echo "2. Verify MongoDB Atlas network access settings"
echo "3. Ensure all environment variables are set correctly"
echo "4. Test login/register from your frontend application"
echo ""
echo "🔧 Common fixes:"
echo "- MongoDB timeout: Check network access in Atlas"
echo "- CORS errors: Verify CLIENT_URL environment variable"
echo "- Auth failures: Check JWT_SECRET is set"