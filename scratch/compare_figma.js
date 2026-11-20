const fs = require('fs');
const refApp = fs.readFileSync('figma_reference/Truth-BackedResumeTailoring-main/src/App.tsx', 'utf8');
const refCss = fs.readFileSync('figma_reference/Truth-BackedResumeTailoring-main/src/index.css', 'utf8');

const figmaLanding = fs.readFileSync('src/components/landing/FigmaLanding.tsx', 'utf8');
const figmaDashboard = fs.readFileSync('src/components/dashboard/FigmaDashboardView.tsx', 'utf8');
const layout = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
const figmaCss = fs.readFileSync('src/app/figma.css', 'utf8');
const globalsCss = fs.readFileSync('src/app/globals.css', 'utf8');

console.log('=== 1. CHECKING CSS CLASSES IN REFERENCE APP.TSX ===');
const refClassMatches = refApp.match(/className="([^"]+)"/g) || [];
const refClasses = new Set();
refClassMatches.forEach(m => {
  const c = m.slice(11, -1);
  c.split(/\s+/).forEach(cls => {
    // ignore dynamic templates like `card-${index}`
    if (!cls.includes('$') && !cls.includes('{')) {
      refClasses.add(cls);
    }
  });
});

console.log(`Found ${refClasses.size} unique CSS classes in ref App.tsx.`);

// Check which of these classes exist in figma.css or globals.css
const combinedCss = figmaCss + '\n' + globalsCss;
const missingClasses = [];
for (const cls of refClasses) {
  // Check if .cls exists
  const regex = new RegExp('\\.' + cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^a-zA-Z0-9_-]');
  if (!regex.test(combinedCss)) {
    missingClasses.push(cls);
  }
}
console.log('Classes from ref App.tsx missing in our CSS:', missingClasses);

console.log('\n=== 2. CHECKING LANDING SECTIONS IN FIGMA LANDING ===');
const refLandingSections = [
  'landing',
  'top-nav',
  'nav-links',
  'nav-actions',
  'hero',
  'hero-copy',
  'eyebrow',
  'hero-lede',
  'hero-actions',
  'micro-trust',
  'hero-visual',
  'visual-label',
  'job-card',
  'proof-tag proof-one',
  'proof-tag proof-two',
  'orange-orbit',
  'scroll-note',
  'ticker',
  'gallery-section',
  'gallery-sticky',
  'gallery-copy',
  'scroll-gallery',
  'scroll-meter',
  'section-bridge',
  'bridge-mark',
  'architecture-section',
  'step-list',
  'step-card',
  'step-number',
  'step-meter',
  'pipeline-visual',
  'tailor-section',
  'tailor-heading',
  'role-tabs',
  'tailor-preview',
  'analysis-rail',
  'truth-box',
  'trust-section',
  'trust-stamp',
  'trust-copy',
  'final-cta',
  'cta-star',
  'footer'
];

for (const sec of refLandingSections) {
  if (!figmaLanding.includes(sec)) {
    console.log('Landing might be missing section/class:', sec);
  }
}

console.log('\n=== 3. CHECKING DASHBOARD SECTIONS ===');
const refDashSections = [
  'dashboard',
  'sidebar',
  'logo',
  'side-bottom',
  'vault-health',
  'dash-main',
  'dash-top',
  'dash-actions',
  'dash-content',
  'welcome-card',
  'welcome-graphic',
  'dashboard-grid',
  'target-panel',
  'panel-title',
  'input-footer',
  'analysis-result',
  'result-score',
  'create-resume',
  'vault-panel',
  'vault-stats',
  'fact-row',
  'fact-icon',
  'verified',
  'view-all',
  'recent-section',
  'recent-head',
  'resume-list',
  'resume-item',
  'mini-doc',
  'score',
  'status'
];

const dashCombined = layout + '\n' + figmaDashboard;
for (const sec of refDashSections) {
  if (!dashCombined.includes(sec)) {
    console.log('Dashboard might be missing section/class:', sec);
  }
}
