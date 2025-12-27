const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get version from command line argument
const versionType = process.argv[2]; // patch, minor, or major

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('Please specify version type: patch, minor, or major');
  process.exit(1);
}

// Read current version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

// Bump version
const newVersion = execSync(`npm version ${versionType} --no-git-tag-version`, { encoding: 'utf8' }).trim().replace('v', '');

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

// Create and push tag
execSync(`git add package.json`);
execSync(`git commit -m "chore: bump version to ${newVersion}"`);
execSync(`git tag v${newVersion}`);
execSync(`git push`);
execSync(`git push origin v${newVersion}`);

console.log(`✅ Released version ${newVersion}`);
