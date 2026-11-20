const fs = require('fs');

const refApp = fs.readFileSync('figma_reference/Truth-BackedResumeTailoring-main/src/App.tsx', 'utf8');
const ourLanding = fs.readFileSync('src/components/landing/FigmaLanding.tsx', 'utf8');

// Extract Landing function from refApp
const refLandingMatch = refApp.slice(refApp.indexOf('function Landing('), refApp.indexOf('function Dashboard('));

console.log('Ref Landing length:', refLandingMatch.length);
console.log('Our Landing length:', ourLanding.length);

// Compare text strings (excluding import/export and Clerk wrappers)
const cleanRef = refLandingMatch
  .replace(/\s+/g, ' ')
  .replace(/Icon/g, 'FigmaIcon')
  .replace(/Logo/g, 'FigmaLogo');

const cleanOur = ourLanding
  .replace(/\s+/g, ' ')
  .replace(/SignInButton|SignUpButton/g, '');

console.log('--- Checking for any text or markup divergence ---');
// Let's check all text strings in JSX
const jsxTexts = refLandingMatch.match(/>([^<]+)</g) || [];
let missingInOur = 0;
for (const t of jsxTexts) {
  const trimmed = t.slice(1, -1).trim();
  if (trimmed.length > 3 && !ourLanding.includes(trimmed)) {
    // Check if it's html escaped e.g. &apos; or '
    const normalized = trimmed.replace(/'/g, "&apos;").replace(/&/g, "&amp;");
    if (!ourLanding.includes(normalized)) {
      console.log('Text from ref Landing NOT in ourLanding:', trimmed);
      missingInOur++;
    }
  }
}
console.log('Total text differences found in Landing:', missingInOur);
