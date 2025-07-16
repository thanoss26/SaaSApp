#!/bin/bash

# Deployment script for SaaS Employee Management App
# This script helps prepare and deploy the application to Render

echo "🚀 Starting deployment preparation..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote origin found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/your-repo-name.git"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Make sure to set environment variables in Render dashboard."
    echo "   Required variables:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - JWT_SECRET"
    echo "   - NODE_ENV=production"
    echo "   - CORS_ORIGIN=https://your-app-name.onrender.com"
fi

# Check if all required files exist
echo "📋 Checking required files..."

required_files=("package.json" "server.js" "render.yaml" ".gitignore")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check if node_modules exists (optional, will be installed on Render)
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. This is normal - it will be installed on Render."
fi

# Commit and push changes
echo "📤 Committing and pushing changes..."

# Add all files
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
else
    # Commit changes
    git commit -m "Deploy to Render - $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://render.com and sign in"
echo "2. Click 'New +' → 'Blueprint'"
echo "3. Connect your GitHub repository"
echo "4. Set environment variables in Render dashboard:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - JWT_SECRET"
echo "   - NODE_ENV=production"
echo "   - CORS_ORIGIN=https://your-app-name.onrender.com"
echo "5. Click 'Create Blueprint Instance'"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
echo "🔗 Your app will be available at: https://your-app-name.onrender.com" 