#!/bin/bash
# Version: 1.0.1
# Description: Build and deploy Clinisync docs to GitHub Pages
# Author: Ali Kahwaji

set -e

echo "Building Docusaurus site for Clinisync..."
npm run build

echo "Deploying to GitHub Pages..."
npx gh-pages -d build -b gh-pages -r https://github.com/DevilsDev/csv_procedure.git

echo "Deployed: https://devilsdev.github.io/csv_procedure/"
