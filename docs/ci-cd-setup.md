# CI/CD Setup Guide

This guide explains how to set up automated publishing for the VRM Character Controller library.

## Prerequisites

1. **Repository on GitHub**
   - Make sure the library is in its own GitHub repository
   - Enable Actions in repository settings

2. **NPM Account with 2FA**
   - Go to https://www.npmjs.com
   - Enable Two-Factor Authentication (required for publishing)

## Setup Steps

### 1. Create NPM Access Token

1. Login to npmjs.com
2. Go to **Account Settings** → **Access Tokens**
3. Click **Generate New Token**
4. Select **Granular Access Token**
5. Configure:
   - Token name: `GitHub Actions` or similar
   - Expiration: 90 days or longer
   - Scope: Select your package `@emlinh/vrm-character-controller`
   - Permissions: Check **Publish**
6. Copy the generated token

### 2. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Paste the token from step 1
6. Click **Add secret**

### 3. Configure Package Repository

Make sure your `package.json` has the correct repository field:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/vrm-character-controller.git"
  }
}
```

## Usage

### Method 1: Automated Release Scripts

From your local machine:

```bash
# For patch updates (bug fixes)
npm run release:patch

# For minor updates (new features)
npm run release:minor

# For major updates (breaking changes)
npm run release:major
```

This will:
1. Update version in package.json
2. Commit the change
3. Create and push a git tag
4. Trigger GitHub Actions to publish to NPM

### Method 2: Manual Tag

```bash
git tag v1.0.1
git push origin v1.0.1
```

### Method 3: GitHub Actions UI

1. Go to **Actions** tab in GitHub
2. Select **Publish to NPM** workflow
3. Click **Run workflow**
4. Enter version number

## Workflow Details

### CI Workflow (`.github/workflows/ci.yml`)
- Runs on every push and PR
- Tests on Node.js 18 and 20
- Verifies build process
- Checks package size

### Publish Workflow (`.github/workflows/publish.yml`)
- Runs on git tags or manual trigger
- Builds the package
- Publishes to NPM
- Creates GitHub Release

## Troubleshooting

### 403 Forbidden Error
- Ensure 2FA is enabled on your NPM account
- Check that NPM_TOKEN has correct permissions
- Verify token hasn't expired

### Build Failures
- Check the Actions tab for detailed logs
- Ensure all dependencies are properly declared
- Verify build script works locally

### Version Conflicts
- Always use semantic versioning
- Check if version already exists on NPM
- Use `npm view @emlinh/vrm-character-controller version` to check latest

## Best Practices

1. **Semantic Versioning**
   - Patch (x.x.1): Bug fixes
   - Minor (x.1.x): New features, backward compatible
   - Major (1.x.x): Breaking changes

2. **Before Publishing**
   - Run tests locally: `npm test`
   - Check build: `npm run build`
   - Verify package size: `npm run bundlesize`

3. **After Publishing**
   - Update documentation
   - Create release notes
   - Notify users of breaking changes

## Security Notes

- Never commit NPM token to repository
- Use granular tokens with minimal permissions
- Rotate tokens regularly (every 90 days)
- Enable 2FA on both NPM and GitHub
