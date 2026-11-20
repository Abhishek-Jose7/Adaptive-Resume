const fs = require('fs');
const content = fs.readFileSync('src/app/globals.css', 'utf8');
const lines = content.split('\n');

const keepIndex = lines.findIndex(line => line.includes('@layer utilities'));
let endOfLayer = -1;
for (let i = keepIndex; i < lines.length; i++) {
  if (lines[i].trim() === '}') {
    endOfLayer = i;
    break;
  }
}

if (endOfLayer === -1) {
  console.error('Could not find end of @layer utilities');
  process.exit(1);
}

const head = lines.slice(0, endOfLayer + 1).join('\n');

const tail = `

/* ==========================================================================
   FIGMA THEME SYSTEM-WIDE STYLES & OVERRIDES (Exact match for Figma design)
   Palette: Ink (#10241c), Cream (#eee9df), Paper (#faf8f2), Orange (#a98452),
   Mint (#becbbf), Acid (#d8c49b), Lilac (#aebbb2), Success (#315849), Line (rgba(16,36,28,0.17))
   ========================================================================== */

/* Universal Contrast & Clarity Guards */
body {
  background-color: #eee9df !important;
  color: #10241c !important;
  font-family: 'Instrument Sans', sans-serif !important;
}

/* Sidebar: Guaranteed dark ink background with crisp white / cream text */
.sidebar {
  background: #10241c !important;
  color: #ffffff !important;
  min-height: 100vh;
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 30;
}
.sidebar .logo {
  margin: 0 10px 45px;
  color: #ffffff !important;
}
.sidebar .logo-mark {
  background: #eee9df !important;
  color: #10241c !important;
}
.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sidebar nav button,
.sidebar nav a,
.side-bottom > button,
.side-bottom > a {
  border: 0;
  background: transparent !important;
  color: rgba(255, 255, 255, 0.72) !important;
  padding: 12px 13px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  border-radius: 3px;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.15s ease;
}
.sidebar nav button:hover,
.sidebar nav a:hover,
.side-bottom > button:hover,
.side-bottom > a:hover {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.08) !important;
}
.sidebar nav button.active,
.sidebar nav a.active {
  background: #eee9df !important;
  color: #10241c !important;
  font-weight: 700 !important;
}
.sidebar nav button.active span,
.sidebar nav a.active span,
.sidebar nav button.active svg,
.sidebar nav a.active svg {
  color: #10241c !important;
}
.sidebar nav button small,
.sidebar nav a small {
  margin-left: auto;
  background: #a98452 !important;
  color: #ffffff !important;
  border-radius: 20px;
  padding: 2px 7px;
  font-size: 10px;
  font-family: 'DM Mono', monospace;
  font-weight: 700;
}
.side-bottom {
  margin-top: auto;
  padding-top: 20px;
}
.vault-health {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  margin-bottom: 15px;
}
.vault-health > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.vault-health span {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  color: #becbbf !important;
  letter-spacing: 0.1em;
}
.vault-health b {
  font-size: 14px;
  color: #ffffff !important;
}
.vault-health i {
  height: 3px;
  display: block;
  background: rgba(255, 255, 255, 0.15) !important;
  margin: 10px 0;
}
.vault-health em {
  height: 100%;
  display: block;
  background: #becbbf !important;
}
.vault-health p {
  font-size: 9px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6) !important;
  margin: 0;
}

/* Landing Tailor Section Preview */
.tailor-preview {
  background: #10241c !important;
}
.analysis-rail {
  color: #ffffff !important;
}
.analysis-rail > span {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  color: #becbbf !important;
  letter-spacing: 0.1em;
}
.analysis-rail b {
  font-size: 11px;
  color: #ffffff !important;
}
.analysis-rail small {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.65) !important;
}
.truth-box {
  margin-top: 55px;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  padding: 12px;
  display: flex;
  gap: 9px;
  align-items: center;
  color: #becbbf !important;
}
.truth-box p {
  font-size: 9px;
  margin: 0;
  line-height: 1.4;
  color: #becbbf !important;
}
.truth-box b {
  color: #ffffff !important;
}

/* Dashboard Top Header & Actions */
.dash-top {
  height: 92px;
  background: #faf8f2 !important;
  border-bottom: 1px solid rgba(16, 36, 28, 0.17) !important;
  padding: 0 4vw;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dash-top span {
  font-family: 'DM Mono', monospace;
  font-size: 8px;
  letter-spacing: 0.1em;
  color: rgba(16, 36, 28, 0.6) !important;
}
.dash-top h1 {
  margin: 5px 0 0;
  font-size: 25px;
  letter-spacing: -0.03em;
  color: #10241c !important;
  font-weight: 700;
}
.dash-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dash-search-btn {
  border: 1px solid rgba(16, 36, 28, 0.17) !important;
  background: #ffffff !important;
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #10241c !important;
  text-decoration: none;
  transition: all 0.15s ease;
}
.dash-search-btn:hover {
  background: #eee9df !important;
  border-color: #10241c !important;
}

/* Proof & Dashboard Common Components (Figma palette) */
.proof-shell {
  background: #eee9df !important;
  color: #10241c !important;
  min-height: 100vh;
}
.proof-page {
  padding: 28px 4vw 60px;
  max-width: 1500px;
  margin: 0 auto;
}
.proof-page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.proof-page-heading h1 {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #10241c !important;
}
.proof-page-intro {
  margin-top: 6px;
  font-size: 14px;
  color: #536259 !important;
}
.proof-text-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #a98452 !important;
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
}
.proof-text-link:hover {
  text-decoration: underline;
}
.proof-form {
  background: #faf8f2 !important;
  border: 1px solid rgba(16, 36, 28, 0.17) !important;
  padding: 24px;
}
.proof-form-heading {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(16, 36, 28, 0.17);
}
.proof-form-heading h2 {
  font-size: 18px;
  font-weight: 700;
  color: #10241c !important;
}
.proof-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.proof-field-label {
  font-size: 12px;
  font-weight: 600;
  color: #10241c !important;
}
.proof-field input,
.proof-field textarea,
.proof-field select {
  background: #ffffff !important;
  border: 1px solid rgba(16, 36, 28, 0.2) !important;
  color: #10241c !important;
  padding: 10px 12px;
  font-size: 13px;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
}
.proof-field input:focus,
.proof-field textarea:focus,
.proof-field select:focus {
  border-color: #a98452 !important;
  box-shadow: 0 0 0 2px rgba(169, 132, 82, 0.2);
}
.proof-btn-primary {
  background: #10241c !important;
  color: #eee9df !important;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.proof-btn-primary:hover {
  opacity: 0.9;
}
.proof-btn-secondary {
  background: #eee9df !important;
  color: #10241c !important;
  border: 1px solid rgba(16, 36, 28, 0.2) !important;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
}
.proof-btn-secondary:hover {
  background: #faf8f2 !important;
}

/* Mobile Sidebar Fixes */
@media (max-width: 650px) {
  .sidebar {
    height: 65px !important;
    min-height: 0 !important;
    position: fixed !important;
    z-index: 50 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    padding: 6px 12px !important;
    flex-direction: row !important;
    align-items: center !important;
  }
  .sidebar nav {
    width: 100% !important;
    flex-direction: row !important;
    justify-content: space-around !important;
  }
  .sidebar nav button,
  .sidebar nav a {
    padding: 9px !important;
    color: rgba(255, 255, 255, 0.72) !important;
  }
  .sidebar nav button.active,
  .sidebar nav a.active {
    background: #eee9df !important;
    color: #10241c !important;
  }
}
`;

fs.writeFileSync('src/app/globals.css', head + tail, 'utf8');
console.log('Successfully updated src/app/globals.css. Total lines:', (head + tail).split('\n').length);
