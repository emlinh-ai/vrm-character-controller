# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the VRM Character Controller library.

## Workflows

### 1. `ci.yml` - Continuous Integration
- **Triggers**: Push to main/develop, Pull Requests
- **Actions**:
  - Tests on Node.js 18 and 20
  - Type checking
  - Build verification
  - Package size checking

### 2. `publish.yml` - Publish to NPM
- **Triggers**:
  - Git tags starting with `v` (e.g., `v1.0.0`)
  - Manual workflow dispatch
- **Actions**:
  - Builds the package
  - Publishes to NPM
  - Creates GitHub Release

## Setup Required

### 1. NPM Token
1. Go to https://www.npmjs.com/settings/your-username/tokens
2. Create a new token with "Publish" permissions
3. Add it as a repository secret named `NPM_TOKEN`

### 2. Enable 2FA on NPM
- Required for publishing packages
- Go to Account Settings > Security > Enable Two-Factor Authentication

## Usage

### Automatic Release (Recommended)
```bash
# Patch release (1.0.0 -> 1.0.1)
npm run release:patch

# Minor release (1.0.0 -> 1.1.0)
npm run release:minor

# Major release (1.0.0 -> 2.0.0)
npm run release:major
```

This will:
1. Bump the version in package.json
2. Create a git tag
3. Push to GitHub
4. Trigger the publish workflow automatically

### Manual Release
1. Go to the Actions tab in GitHub
2. Select "Publish to NPM" workflow
3. Click "Run workflow"
4. Enter the version number

### Git Tag Method
```bash
git tag v1.0.0
git push origin v1.0.0
```

This will automatically trigger the publish workflow.
