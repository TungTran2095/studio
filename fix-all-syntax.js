const fs = require('fs');
const path = require('path');

// Files that need syntax fixes
const filesToFix = [
  'src/app/api/data/ohlcv/route.ts',
  'src/app/api/datasets/supabase/route.ts',
  'src/app/api/research/debug-indicators/route.ts',
  'src/app/api/research/experiments/backtest/route.ts',
  'src/app/api/research/experiments/hypothesis/route.ts',
  'src/app/api/research/experiments/patch-backtest/route.ts'
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix duplicate imports
  const importLines = content.match(/import.*?;/g) || [];
  const uniqueImports = [];
  const seenImports = new Set();
  
  for (const importLine of importLines) {
    if (!seenImports.has(importLine)) {
      uniqueImports.push(importLine);
      seenImports.add(importLine);
    }
  }
  
  if (uniqueImports.length !== importLines.length) {
    // Replace all imports with unique ones
    let newContent = content;
    for (const importLine of importLines) {
      newContent = newContent.replace(importLine, '');
    }
    newContent = uniqueImports.join('\n') + '\n\n' + newContent.replace(/import.*?;/g, '').trim();
    content = newContent;
    modified = true;
  }

  // Fix duplicate variable declarations
  const lines = content.split('\n');
  const cleanedLines = [];
  const seenVars = new Set();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('const ') || trimmedLine.startsWith('let ') || trimmedLine.startsWith('var ')) {
      const varName = trimmedLine.split('=')[0].split(' ')[1];
      if (seenVars.has(varName)) {
        continue; // Skip duplicate variable declarations
      }
      seenVars.add(varName);
    }
    cleanedLines.push(line);
  }
  
  if (cleanedLines.length !== lines.length) {
    content = cleanedLines.join('\n');
    modified = true;
  }

  // Fix missing closing braces
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  
  if (openBraces > closeBraces) {
    content = content.trim() + '\n}'.repeat(openBraces - closeBraces);
    modified = true;
  }

  // Fix orphaned closing braces
  content = content.replace(/\n\s*}\s*\n\s*export/g, '\n\nexport');
  content = content.replace(/\n\s*}\s*\n\s*}/g, '\n}');

  // Fix missing closing braces for functions
  if (content.includes('export async function') && !content.trim().endsWith('}')) {
    content = content.trim() + '\n}';
    modified = true;
  }

  // Fix duplicate try blocks
  content = content.replace(/try\s*{\s*try\s*{/g, 'try {');
  content = content.replace(/}\s*catch\s*\([^)]*\)\s*{\s*}\s*catch\s*\(/g, '} catch (');

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed syntax: ${filePath}`);
  } else {
    console.log(`⏭️ No syntax issues: ${filePath}`);
  }
}

console.log('🔧 Fixing all syntax errors in API routes...\n');

filesToFix.forEach(fixFile);

console.log('\n✅ All syntax fixes completed!');
console.log('📝 Please review the changes and commit them.');
