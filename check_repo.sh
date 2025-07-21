#!/bin/bash

# Repository Status Check Script

echo "🔍 Dashcam Server Repository Status"
echo "===================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository"
    exit 1
fi

echo "✅ Git repository initialized"

# Check current branch
BRANCH=$(git branch --show-current)
echo "📍 Current branch: $BRANCH"

# Check commit status
COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "0")
echo "📝 Total commits: $COMMITS"

# Check if remote is set
REMOTE=$(git remote -v 2>/dev/null)
if [ -z "$REMOTE" ]; then
    echo "⚠️  No remote repository set"
    echo ""
    echo "Next steps:"
    echo "1. Create repository on GitHub"
    echo "2. Add remote: git remote add origin https://github.com/USERNAME/dashcam-backend-server.git"
    echo "3. Push code: git push -u origin main"
else
    echo "🌐 Remote repository:"
    echo "$REMOTE"
    
    # Check if we can push
    echo ""
    echo "📤 Checking push status..."
    if git push --dry-run origin main 2>/dev/null; then
        echo "✅ Ready to push to remote"
    else
        echo "⚠️  May need to push to remote first"
    fi
fi

# List files to be committed/pushed
echo ""
echo "📁 Repository files:"
git ls-files | while read file; do
    echo "  ✓ $file"
done

echo ""
echo "🚀 Repository is ready for GitHub!"
echo "   Follow instructions in PUSH_TO_GITHUB.md"