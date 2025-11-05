# GitHub Actions Workflows

This document contains the recommended GitHub Actions workflows for AI Lead Gen Pro.

**Note:** Due to GitHub App permissions, these workflow files are provided here for you to add manually to your repository.

## Setup Instructions

To add these workflows to your repository:

1. Create the `.github/workflows/` directory in your repository
2. Copy each workflow below into separate files in that directory
3. Commit and push the files
4. Configure the required secrets in your GitHub repository settings

## Required Secrets

Configure these in your GitHub repository settings (Settings → Secrets and variables → Actions):

- `VERCEL_TOKEN` - Your Vercel deployment token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID
- `DATABASE_URL` - PostgreSQL connection string for tests

---

## Workflow 1: Test (`.github/workflows/test.yml`)

Runs tests on every push and pull request.

```yaml
name: Test

on:
  push:
    branches: [ main, develop, claude/* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: ai_lead_gen_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Type check
      run: npm run type-check

    - name: Lint code
      run: npm run lint

    - name: Run unit tests
      run: npm test -- --coverage
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/ai_lead_gen_test
        REDIS_URL: redis://localhost:6379
        NODE_ENV: test
        DEFAULT_CLIENT_ID: test-client
        ALLOW_ANONYMOUS: true

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      if: matrix.node-version == '18.x'
      with:
        files: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

    - name: Build application
      run: npm run build
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/ai_lead_gen_test

  security:
    name: Security Audit
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18.x
        cache: 'npm'

    - name: Run security audit
      run: npm audit --audit-level=moderate
      continue-on-error: true

    - name: Check for outdated dependencies
      run: npm outdated || true
```

---

## Workflow 2: Lint (`.github/workflows/lint.yml`)

Runs linting and formatting checks.

```yaml
name: Lint

on:
  push:
    branches: [ main, develop, claude/* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint:
    name: Lint and Format Check
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run ESLint
      run: npm run lint

    - name: Check TypeScript types
      run: npm run type-check

    - name: Check code formatting with Prettier
      run: npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"

    - name: Comment PR with lint errors
      if: failure() && github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '⚠️ Lint checks failed. Please fix the linting errors and push again.'
          })
```

---

## Workflow 3: Deploy (`.github/workflows/deploy.yml`)

Automatically deploys to Vercel on push to main branch.

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/test
        NODE_ENV: test
        DEFAULT_CLIENT_ID: test-client
        ALLOW_ANONYMOUS: true

    - name: Build application
      run: npm run build
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        github-comment: true

  notify:
    name: Notify Deployment
    runs-on: ubuntu-latest
    needs: deploy
    if: always()

    steps:
    - name: Deployment Status
      run: |
        if [ "${{ needs.deploy.result }}" == "success" ]; then
          echo "✅ Deployment succeeded!"
        else
          echo "❌ Deployment failed!"
          exit 1
        fi
```

---

## Manual Setup Steps

### 1. Create Workflow Files

```bash
# Create the directory
mkdir -p .github/workflows

# Create test workflow
cat > .github/workflows/test.yml << 'EOF'
# (Copy the test workflow content from above)
EOF

# Create lint workflow
cat > .github/workflows/lint.yml << 'EOF'
# (Copy the lint workflow content from above)
EOF

# Create deploy workflow
cat > .github/workflows/deploy.yml << 'EOF'
# (Copy the deploy workflow content from above)
EOF
```

### 2. Configure GitHub Secrets

Go to your repository settings: `Settings → Secrets and variables → Actions → New repository secret`

Add each required secret:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL`

### 3. Commit and Push

```bash
git add .github/workflows/
git commit -m "ci: Add GitHub Actions workflows"
git push
```

### 4. Verify Workflows

- Go to the "Actions" tab in your GitHub repository
- You should see the workflows listed
- They will run automatically on the next push

---

## Optional: Codecov Integration

For test coverage reporting:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Add `CODECOV_TOKEN` to your GitHub secrets (if repository is private)

---

## Customization

### Adjust Node.js Versions

In `test.yml`, modify the matrix:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]  # Add or remove versions
```

### Change Branch Triggers

In any workflow, modify the `on` section:

```yaml
on:
  push:
    branches: [ main, develop, staging ]  # Your branches
  pull_request:
    branches: [ main ]
```

### Disable Deployment Workflow

If you don't use Vercel, simply don't create the `deploy.yml` file.

---

## Troubleshooting

### Workflow Not Running

- Check that the workflow file is in `.github/workflows/`
- Verify the YAML syntax is correct
- Check the "Actions" tab for errors

### Tests Failing

- Ensure all environment variables are set
- Check service container status
- Review the action logs for details

### Deployment Failing

- Verify all Vercel secrets are correct
- Check that the Vercel project is properly configured
- Review the deployment logs

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel GitHub Integration](https://vercel.com/docs/git/vercel-for-github)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)
