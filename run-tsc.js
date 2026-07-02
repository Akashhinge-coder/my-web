const { execSync } = require('child_process');
const fs = require('fs');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  fs.writeFileSync('tsc-output.txt', 'TypeScript check passed\\n');
} catch (error) {
  fs.writeFileSync('tsc-output.txt', 'TypeScript check failed:\\n' + error.stdout.toString() + '\\n' + error.stderr.toString());
}
