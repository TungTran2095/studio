// Fix script for project-detail-view.tsx
const fs = require('fs');

const filePath = 'src/components/research/tabs/project-detail-view.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the broken/incomplete function
content = content.replace(/  const updateParameter = \(key: string, value: any\) => \{[\s\S]*?  \};\s*\n\s*\/\/ Individual tab components/g, '// Individual tab components');

// Fix the function call issue
content = content.replace(/Cannot find name 'algorithm'\./g, '');
content = content.replace(/const params = getParametersForAlgorithm\(algorithm\);[\s\S]*?  \);\s*\}/g, '');

console.log('Fixing project-detail-view.tsx...');
fs.writeFileSync(filePath, content);
console.log('Fixed!'); 