#!/bin/bash
# Version: 1.0.0
# Description: Build and deploy Clinisync docs to GitHub Pages
# Author: Ali Kahwaji

set -e

echo "í³¦ Building Docusaurus site for Clinisync..."
npm run build

echo "íº€ Deploying to GitHub Pages..."
npx gh-pages -d build -b gh-pages -r https://github.com/DevilsDev/csv_procedure.git

echo "âœ… Deployed successfully to: https://devilsdev.github.io/csv_procedure/"

