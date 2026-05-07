/**
 * Version: 2.7.3
 * Description: Renders docs/static/img/og-card.svg to a 1200x630 PNG. The PNG is what
 *              social platforms (Twitter/X, LinkedIn, Slack, Discord, Facebook) actually
 *              consume — many of them don't render SVG og:images. The SVG is kept as the
 *              source of truth; this script is the publishing step.
 *
 *              Run with: node scripts/generate-og-png.js
 *              Output:   docs/static/img/og-card.png
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.resolve(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'docs', 'static', 'img', 'og-card.svg');
const PNG_PATH = path.join(ROOT, 'docs', 'static', 'img', 'og-card.png');

function main() {
  if (!fs.existsSync(SVG_PATH)) {
    throw new Error('source SVG not found: ' + SVG_PATH);
  }
  const svg = fs.readFileSync(SVG_PATH, 'utf8');

  const resvg = new Resvg(svg, {
    background: 'rgba(255,255,255,1)',
    fitTo: { mode: 'width', value: 1200 },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Inter',
      // Fall back gracefully across platforms.
      fontFamilies: ['Inter', 'Arial', 'Helvetica', 'sans-serif'],
    },
    shapeRendering: 2,        // crisp edges
    textRendering: 1,         // optimize legibility
    imageRendering: 0,        // optimize quality
  });

  const png = resvg.render().asPng();
  fs.writeFileSync(PNG_PATH, png);

  const kb = (png.length / 1024).toFixed(1);
  console.log('wrote ' + path.relative(ROOT, PNG_PATH) + ' (' + kb + ' KB)');
}

main();
