#!/bin/bash

# Exit on error
set -e

# 1. Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "🚀 Preparing release for $TAG..."

# 1.5 Sync Landing Page version manifest (docs/version.json & docs/index.html)
node -e "
const fs = require('fs');
const ver = '$VERSION';
const tag = 'v' + ver;
const manifest = {
  version: ver,
  tag,
  macUrl: \`https://github.com/Seabass2333/DeskMate/releases/download/\${tag}/DeskMate-\${ver}-mac-universal.dmg\`,
  winUrl: \`https://github.com/Seabass2333/DeskMate/releases/download/\${tag}/DeskMate-\${ver}-win-x64.exe\`,
  releasesUrl: 'https://github.com/Seabass2333/DeskMate/releases/latest',
  updatedAt: new Date().toISOString().slice(0, 10)
};
fs.writeFileSync('./docs/version.json', JSON.stringify(manifest, null, 2) + '\n');
let html = fs.readFileSync('./docs/index.html', 'utf8');
html = html.replace(/v\d+\.\d+\.\d+ · macOS/g, \`\${tag} · macOS\`);
html = html.replace(/releases\/download\/v[^\/]+\/DeskMate-[^-]+-mac-universal\.dmg/g, \`releases/download/\${tag}/DeskMate-\${ver}-mac-universal.dmg\`);
html = html.replace(/releases\/download\/v[^\/]+\/DeskMate-[^-]+-win-x64\.exe/g, \`releases/download/\${tag}/DeskMate-\${ver}-win-x64.exe\`);
fs.writeFileSync('./docs/index.html', html);
"

if [[ -n $(git status -s docs/version.json docs/index.html) ]]; then
  echo "📝 Updating landing page version manifest to $TAG..."
  git add docs/version.json docs/index.html
  git commit -m "chore(release): sync landing page version to $TAG"
fi

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
