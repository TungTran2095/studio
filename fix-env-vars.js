const fs = require('fs');
const path = require('path');

// Files that need to be fixed
const filesToFix = [
  'src/app/api/datasets/supabase/route.ts',
  'src/app/api/data/ohlcv/route.ts',
  'src/app/api/research/debug-indicators/route.ts',
  'src/app/api/research/experiments/route.ts',
  'src/app/api/research/datasets/route.ts',
  'src/app/api/research/experiments/hypothesis/route.ts',
  'src/app/api/research/monte-carlo/route.ts',
  'src/app/api/research/experiments/patch-backtest/route.ts',
  'src/app/api/research/projects/route.ts',
  'src/app/api/research/scripts/route.ts',
  'src/app/api/research/experiments/backtest/route.ts',
  'src/app/api/research/optimization/route.ts',
  'src/app/api/research/models/route.ts',
  'src/app/api/research/setup-database/route.ts',
  'src/app/api/research/test-create/route.ts',
  'src/app/api/research/models/actions/route.ts',
  'src/app/api/research/models/train/route.ts',
  'src/app/api/research/setup-real-database/route.ts',
  'src/app/api/research/setup-experiments/route.ts',
  'src/app/api/research/models/test/route.ts',
  'src/app/api/research/walk-forward/route.ts',
  'src/app/api/research/setup-indicators/route.ts',
  'src/app/api/research/test-schema/route.ts',
  'src/lib/trading/walk-forward-service.ts',
  'src/lib/supabase/market-data-service.ts'
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix NEXT_PUBLIC_SUPABASE_URL! patterns
  const urlPattern = /process\.env\.NEXT_PUBLIC_SUPABASE_URL!/g;
  if (urlPattern.test(content)) {
    content = content.replace(urlPattern, 'process.env.NEXT_PUBLIC_SUPABASE_URL');
    modified = true;
  }

  // Fix NEXT_PUBLIC_SUPABASE_ANON_KEY! patterns
  const anonKeyPattern = /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!/g;
  if (anonKeyPattern.test(content)) {
    content = content.replace(anonKeyPattern, 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
    modified = true;
  }

  // Fix SUPABASE_SERVICE_ROLE_KEY! patterns
  const serviceKeyPattern = /process\.env\.SUPABASE_SERVICE_ROLE_KEY!/g;
  if (serviceKeyPattern.test(content)) {
    content = content.replace(serviceKeyPattern, 'process.env.SUPABASE_SERVICE_ROLE_KEY');
    modified = true;
  }

  // Add environment variable checks for API routes
  if (filePath.includes('/api/') && filePath.endsWith('/route.ts')) {
    // Check if file already has environment checks
    if (!content.includes('Check if Supabase client is available')) {
      // Find the supabase client initialization
      const supabaseInitPattern = /const supabase = createClient\([^)]+\);/;
      const match = content.match(supabaseInitPattern);
      
      if (match) {
        const oldInit = match[0];
        const newInit = `// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;`;
        
        content = content.replace(oldInit, newInit);
        modified = true;

        // Add check in POST/GET functions
        const functionPattern = /export async function (POST|GET)\([^)]*\)\s*\{/g;
        content = content.replace(functionPattern, (match, method) => {
          return `${match}
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.log('⚠️ Supabase client not available - environment variables missing');
      return NextResponse.json(
        { 
          error: 'Database connection not available',
          details: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
          success: false
        },
        { status: 503 }
      );
    }

    `;
        });
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⏭️ No changes needed: ${filePath}`);
  }
}

console.log('🔧 Fixing environment variables in API routes...\n');

filesToFix.forEach(fixFile);

console.log('\n✅ Environment variables fix completed!');
console.log('📝 Please review the changes and commit them.');
