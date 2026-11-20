const fs = require('fs');

const refApp = fs.readFileSync('figma_reference/Truth-BackedResumeTailoring-main/src/App.tsx', 'utf8');
const layout = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
const dashView = fs.readFileSync('src/components/dashboard/FigmaDashboardView.tsx', 'utf8');

const refDash = refApp.slice(refApp.indexOf('function Dashboard('), refApp.indexOf('export default function App('));

console.log('Ref Dashboard length:', refDash.length);

const ourDashCombined = layout + '\n' + dashView;

// Extract all classNames from refDash
const refDashClasses = (refDash.match(/className="([^"]+)"/g) || []).map(m => m.slice(11, -1));
console.log('ClassNames in Ref Dashboard:', refDashClasses);

let missingClasses = [];
for (const cls of refDashClasses) {
  // Check if each class is in layout or dashView
  const parts = cls.split(' ');
  for (const p of parts) {
    if (!ourDashCombined.includes(p)) {
      missingClasses.push(p);
    }
  }
}
console.log('Missing class names in our Dashboard:', missingClasses);
