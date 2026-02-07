# Best Practices for Building Agent Skills

> Quick reference for building high-quality skills. Follow this every time.

**📖 For comprehensive guidance, see [Anthropic's Official Skills Guide Summary](./docs/ANTHROPIC-GUIDE-SUMMARY.md)**

---

## How Skills Work

Skills are **prompt templates**, not executable code. The agent reads `description` → matches user intent → loads `SKILL.md` → follows instructions. That's it.

## Directory Structure

```
my-skill/
├── SKILL.md          # Required — frontmatter + instructions
├── scripts/          # Optional — executable helpers
│   └── tool.py
└── references/       # Optional — detailed docs loaded on-demand
    └── api-spec.md
```

- Directory name = `name` field (lowercase, hyphens only)
- Keep SKILL.md under 500 lines — put details in `references/`

## SKILL.md Frontmatter

```yaml
---
name: my-skill
description: >
  [What it does]. Use when [trigger conditions].
  Supports [specific capabilities].
---
```

### The description is everything

The agent matches user intent against descriptions using language understanding. If your description is vague, your skill won't get invoked.

```yaml
# ✅ Specific — what + when + keywords
description: >
  Fetch stock prices, credit metrics, and macro data via Yahoo Finance.
  Use when the user asks about stock prices, bond yields, FX rates,
  company fundamentals, leverage ratios, or market conditions.

# ❌ Vague — won't match anything
description: Helps with financial data.
```

**Rules:** Front-load important info. Include keywords the user would say. Under 1024 chars but use most of it.

## Progressive Disclosure

1. **Frontmatter** (~100 tokens) — loaded for ALL skills at startup. Be precise.
2. **SKILL.md body** (<500 lines) — loaded when invoked. Core instructions only.
3. **Referenced files** — loaded on-demand. Can be large.

## Scripts

```bash
#!/usr/bin/env bash
set -euo pipefail

# Check prerequisites
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq required" >&2; exit 1; }

# Validate inputs
[[ $# -ge 1 ]] || { echo "Usage: $0 <arg>" >&2; exit 1; }

# Do the work...
```

**Rules:**
- Always include shebang
- `set -euo pipefail` for bash
- Validate inputs, check prerequisites
- Errors to stderr, meaningful exit codes
- Support `--json` for machine-readable output

For Python with dependencies, use PEP 723 + `uv run --script`:
```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["yfinance", "rich"]
# ///
```

## Security

- **Scope `allowed-tools` narrowly** — don't grant Bash if you only need Read
- **Never embed secrets** — use env vars
- **Validate all script inputs**
- **Use `disable-model-invocation: true`** for destructive actions

## Testing

Before publishing:

1. Does the agent invoke it from natural language (without naming the skill)?
2. Tested on 2+ models (Haiku + Sonnet minimum)?
3. Tested 3 scenarios: happy path, edge case, error?
4. SKILL.md under 500 lines / <5000 tokens?

## Checklist

- [ ] Description: specific, keyword-rich, "what" + "when"
- [ ] SKILL.md body under 500 lines
- [ ] Scripts have shebangs, error handling, input validation
- [ ] No secrets in files
- [ ] Tested on 2+ models with 3+ scenarios
- [ ] `name` matches directory name

---

*Based on the [Agent Skills spec](https://agentskills.io/specification), [Claude Code docs](https://code.claude.com/docs/en/skills), and [OpenClaw docs](https://docs.openclaw.ai/tools/skills).*
