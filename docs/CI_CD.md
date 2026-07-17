# CI/CD Integration

Integrate forge code review into your CI/CD pipeline for automated PR/MR quality checks.

---

## GitHub Actions

### Basic PR Review

```yaml
# .github/workflows/forge-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install forge
        run: npm install -g forge-dev

      - name: Setup gh CLI
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | gh auth login --with-token

      - name: Run AI Code Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          forge review ${{ github.event.pull_request.html_url }} \
            --format json \
            --output .forge/review-report.json \
            --no-tui

      - name: Post Review Summary
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('.forge/review-report.json', 'utf8'));

            const summary = report.summary;
            const findings = report.findings;

            let body = '## 🤖 AI Code Review Summary\n\n';
            body += `| Severity | Count |\n`;
            body += `|----------|-------|\n`;
            body += `| 🔴 Critical | ${summary.critical} |\n`;
            body += `| 🟠 Major    | ${summary.major} |\n`;
            body += `| 🟡 Minor    | ${summary.minor} |\n`;
            body += `| 🔵 Info     | ${summary.info} |\n`;

            if (findings.length > 0) {
              body += '\n### Top Findings\n\n';
              for (const f of findings.slice(0, 5)) {
                body += `- **${f.severity.toUpperCase()}** [${f.file}:${f.lineStart}]: ${f.title}\n`;
              }
            }

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });
```

### Fail on Critical Issues

```yaml
- name: Check for critical issues
  run: |
    CRITICAL=$(cat .forge/review-report.json | jq '.summary.critical')
    if [ "$CRITICAL" -gt 0 ]; then
      echo "❌ Found $CRITICAL critical issues. Failing build."
      exit 1
    fi
```

---

## GitLab CI

```yaml
# .gitlab-ci.yml
forge-review:
  stage: review
  image: node:22
  variables:
    GLAB_TOKEN: $CI_JOB_TOKEN
  script:
    - npm install -g forge-dev
    - glab auth login --hostname gitlab.com --stdin <<< "$GLAB_TOKEN"
    - |
      export ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
      forge review $CI_MERGE_REQUEST_PROJECT_URL/-/merge_requests/$CI_MERGE_REQUEST_IID \
        --format json \
        --output .forge/review-report.json \
        --no-tui
  artifacts:
    paths:
      - .forge/review-report.json
      - .forge/review-report.md
    when: always
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

---

## SARIF Integration (GitHub Code Scanning)

```bash
forge review $PR_URL --format sarif --output .forge/review.sarif
```

Upload to GitHub Code Scanning:

```yaml
- name: Upload SARIF report
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: .forge/review.sarif
    category: ai-code-review
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `OLLAMA_HOST` | Ollama host URL (default: `http://localhost:11434`) |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Review completed successfully |
| 1 | Review failed or error occurred |
