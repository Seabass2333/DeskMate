#!/bin/bash

# Exit on error
set -e

# 1. Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "🚀 Preparing release for $TAG..."

# 2. Check current status
if [[ -n $(git status -s) ]]; then
  echo "❌ Error: Working directory is not clean. Please commit or stash changes first."
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $BRANCH"

# 3. Handle Branch Logic
if [ "$BRANCH" = "develop" ]; then
  echo "🔀 Merging develop into main..."
  git checkout main
  git pull origin main
  git merge develop
  git push origin main
  
  echo "🏷️ Tagging $TAG on main..."
  if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "⚠️ Tag $TAG already exists, updating it..."
    git tag -d "$TAG"
    git push origin :refs/tags/"$TAG"
  fi
  
  git tag "$TAG"
  git push origin "$TAG"
  
  echo "🔙 Returning to develop..."
  git checkout develop
  
elif [ "$BRANCH" = "main" ]; then
  echo "🏷️ Tagging $TAG on main..."
   if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "⚠️ Tag $TAG already exists, updating it..."
    git tag -d "$TAG"
    git push origin :refs/tags/"$TAG"
  fi
  git tag "$TAG"
  git push origin "$TAG"
  
else
  echo "❌ Error: Releases should only be run from 'develop' or 'main' branches."
  exit 1
fi

echo "✅ Release $TAG submitted successfully!"
echo "   - Merged to main"
echo "   - Tagged $TAG"
echo "   - Pushed to remote"
