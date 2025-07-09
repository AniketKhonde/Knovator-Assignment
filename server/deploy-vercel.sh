#!/bin/bash

# Vercel Backend Deployment Script
# This script helps deploy the backend to Vercel

set -e

echo "🚀 Starting Vercel Backend Deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "   npm install -g vercel"
    exit 1
fi

# Check if we're in the server directory
if [ ! -f "package.json" ] || [ ! -f "vercel.json" ]; then
    echo "❌ Please run this script from the server directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Make sure to set environment variables in Vercel dashboard."
    echo "   You can copy env.example to .env and update the values:"
    echo "   cp env.example .env"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Vercel dashboard"
echo "2. Configure external services (MongoDB Atlas, Redis Cloud)"
echo "3. Set up external cron jobs (GitHub Actions or cron-job.org)"
echo "4. Update frontend API configuration"
echo "5. Test the deployed API endpoints"
echo ""
echo "📚 For detailed instructions, see: VERCEL_DEPLOYMENT.md" 