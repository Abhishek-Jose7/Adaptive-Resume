const fs = require('fs');

const refCss = fs.readFileSync('figma_reference/Truth-BackedResumeTailoring-main/src/index.css', 'utf8');
const ourFigmaCss = fs.readFileSync('src/app/figma.css', 'utf8');

// Extract all selector blocks from refCss
const selectorRegex = /([^{}]+)\{([^{}]+)\}/g;
let match;
let missingSelectors = [];
let totalSelectors = 0;

while ((match = selectorRegex.exec(refCss)) !== null) {
  const selector = match[1].trim();
  // ignore @import, @layer, @keyframes, @media
  if (selector.startsWith('@') || selector.includes('%') || selector.startsWith('from') || selector.startsWith('to')) {
    continue;
  }
  totalSelectors++;
  // normalize whitespace
  const norm = selector.replace(/\s+/g, ' ');
  if (!ourFigmaCss.includes(norm) && !ourFigmaCss.replace(/\s+/g, ' ').includes(norm)) {
    missingSelectors.push(norm);
  }
}

console.log('Total selectors in ref index.css:', totalSelectors);
console.log('Missing selectors in our figma.css:', missingSelectors);
