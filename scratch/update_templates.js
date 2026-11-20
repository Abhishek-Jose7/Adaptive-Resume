const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let changed = 0;

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('#000052') || content.includes('#B2BEB5')) {
    content = content.replace(/#000052/g, '#10241c');
    content = content.replace(/#B2BEB5/g, '#becbbf');
    fs.writeFileSync(f, content, 'utf8');
    changed++;
    console.log('Updated:', f);
  }
}
console.log('Total files cleaned up:', changed);
