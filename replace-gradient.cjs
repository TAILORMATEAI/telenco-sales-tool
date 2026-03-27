const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'telenco sales tool', 'src'); // Note we are running inside TELENCO SALES TOOL

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  }
  return results;
}

const files = walk(path.join(process.cwd(), 'src'));

let replacedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const og = content;
  
  // Replace simple bg colors
  content = content.replace(/bg-\[#E74B4D\]/g, 'bg-eneco-gradient');
  content = content.replace(/hover:bg-\[#E74B4D\]/g, 'hover:bg-eneco-gradient text-white');
  content = content.replace(/hover:bg-\[#c73a3c\]/g, 'opacity-90 transition-opacity');
  content = content.replace(/text-\[#E74B4D\]/g, 'text-eneco-gradient');
  
  // Replace direct svg references in background vectors or elements
  // The global gradient id we will use is `enecoGrad`.
  // When there's a raw fill="#E74B4D", we can change to fill="url(#enecoGrad)"
  content = content.replace(/fill="#E74B4D"/ig, 'fill="url(#enecoGrad)"');
  content = content.replace(/stroke="#E74B4D"/ig, 'stroke="url(#enecoGrad)"');

  // Also replace #E74B4D in any <LiquidGlassSlider ... color="#E74B4D" /> to be transparent or removed if not supported? 
  // Let's change LiquidGlassSlider color to the base gradient start (#E5394C) because slider might not support URL
  content = content.replace(/color="#E74B4D"/g, 'color="#E5394C"');

  // Any other remaining #E74B4D we change to base #E5394C to match newly requested colors if left behind
  content = content.replace(/#E74B4D/gi, '#E5394C');

  if (og !== content) {
    fs.writeFileSync(file, content, 'utf8');
    replacedCount++;
    console.log(`Updated ${path.basename(file)}`);
  }
}

console.log(`Done. Updated ${replacedCount} files.`);
