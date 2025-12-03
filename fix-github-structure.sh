#!/bin/bash

# Fix GitHub repository structure - move all files to root

cd /mnt/c/Users/fixxZ/Downloads/botelemment

echo "🔍 Current directory: $(pwd)"
echo "📁 Files in current directory:"
ls -la | head -10
echo ""

# Check if there's a nested Downloads/botelemment structure
if [ -d "Downloads/botelemment" ]; then
    echo "⚠️  Found nested Downloads/botelemment directory"
    echo "🔄 Moving files from nested directory to root..."
    
    # Move files from nested to root
    cp -r Downloads/botelemment/* . 2>/dev/null || true
    cp -r Downloads/botelemment/.* . 2>/dev/null || true
    
    # Remove nested structure
    rm -rf Downloads/
    echo "✅ Files moved to root"
fi

# Remove .git to start fresh
echo ""
echo "🗑️  Removing old .git directory..."
rm -rf .git

# Initialize fresh git repo
echo "🔄 Initializing new git repository..."
git init
git branch -M main

# Add all files at root level
echo "📝 Adding all files..."
git add .

# Show what will be committed
echo ""
echo "📋 Files to be committed (should all be at root):"
git status --short | head -20

# Commit
echo ""
echo "💾 Creating commit..."
git commit -m "Fix: All files at repository root"

# Add remote
echo ""
echo "🔗 Setting up remote..."
git remote add origin https://github.com/foxindevv/botelemment.git 2>/dev/null || \
git remote set-url origin https://github.com/foxindevv/botelemment.git

# Push to GitHub (force to overwrite)
echo ""
echo "🚀 Pushing to GitHub (this will overwrite the nested structure)..."
git push -f origin main

echo ""
echo "✅ Done! Check: https://github.com/foxindevv/botelemment"
echo "📁 Files should now be at root, not under Downloads/botelemment/"
