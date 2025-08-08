const fs = require('fs');
const path = require('path');

// Files that need syntax fixes
const filesToFix = [
  'src/app/api/data/ohlcv/route.ts',
  'src/app/api/datasets/supabase/route.ts',
  'src/app/api/research/debug-indicators/route.ts',
  'src/app/api/research/experiments/backtest/route.ts',
  'src/app/api/research/experiments/hypothesis/route.ts'
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix missing imports
  if (!content.includes('import { NextRequest, NextResponse }')) {
    content = content.replace(
      'import { createClient } from \'@supabase/supabase-js\';',
      'import { NextRequest, NextResponse } from \'next/server\';\nimport { createClient } from \'@supabase/supabase-js\';'
    );
    modified = true;
  }

  // Fix duplicate lines
  const lines = content.split('\n');
  const cleanedLines = [];
  let prevLine = '';
  
  for (const line of lines) {
    if (line.trim() !== prevLine.trim()) {
      cleanedLines.push(line);
      prevLine = line;
    }
  }
  
  if (cleanedLines.length !== lines.length) {
    content = cleanedLines.join('\n');
    modified = true;
  }

  // Fix missing closing braces
  if (content.includes('export async function POST') && !content.includes('export async function GET')) {
    // Add missing closing brace before POST function
    const postIndex = content.indexOf('export async function POST');
    const beforePost = content.substring(0, postIndex);
    
    if (!beforePost.trim().endsWith('}')) {
      content = beforePost + '}\n\n' + content.substring(postIndex);
      modified = true;
    }
  }

  // Fix missing closing braces at end
  if (!content.trim().endsWith('}')) {
    content = content.trim() + '\n}';
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed syntax: ${filePath}`);
  } else {
    console.log(`⏭️ No syntax issues: ${filePath}`);
  }
}

console.log('🔧 Fixing syntax errors in API routes...\n');

filesToFix.forEach(fixFile);

console.log('\n✅ Syntax fixes completed!');
console.log('📝 Please review the changes and commit them.');
