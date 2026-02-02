# Best Practices for Building Agent Skills

> A comprehensive, practical guide for building high-quality agent skills. Based on the [Agent Skills open standard](https://agentskills.io), Claude Code docs, OpenClaw conventions, community patterns, and real-world examples.
>
> Last updated: February 2026

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Directory Structure](#directory-structure)
3. [SKILL.md: The Entrypoint](#skillmd-the-entrypoint)
4. [Writing Great Descriptions](#writing-great-descriptions)
5. [Progressive Disclosure](#progressive-disclosure)
6. [Scripts & Code](#scripts--code)
7. [Security](#security)
8. [Dependencies & Installation](#dependencies--installation)
9. [Testing & Validation](#testing--validation)
10. [Documentation](#documentation)
11. [Platform-Specific Notes](#platform-specific-notes)
12. [Checklist](#checklist)

---

## Core Concepts

Skills are **not executable code**. They are **prompt templates** that inject domain-specific instructions into the agent's conversation context. When a skill is invoked:

1. The agent reads the skill's `description` from its system prompt
2. If the description matches the user's intent, the agent loads `SKILL.md`
3. The markdown content becomes instructions that guide the agent's behavior
4. Optional scripts, references, and assets are loaded on-demand

This means: **the description is how the agent discovers your skill, and the SKILL.md body is how the agent executes it.** Both must be excellent.

### Skills vs Tools vs MCP

| Aspect | Skills | Tools (Read/Write/Bash) | MCP Servers |
|--------|--------|------------------------|-------------|
| What they are | Prompt templates + files | Executable operations | External API bridges |
| When to use | Domain knowledge, workflows, conventions | Direct file/system operations | External service integration |
| Execution | Context injection → agent reasons | Synchronous, returns results | Client-server protocol |
| Portability | High (just markdown + files) | Agent-specific | Standardized but heavier |

**Rule of thumb:** If you're packaging *knowledge* or *workflow*, use a skill. If you need a *live API connection*, consider MCP. If you need a *quick CLI wrapper*, a skill with a script works great.

---

## Directory Structure

### Minimal (most skills)

```
my-skill/
└── SKILL.md          # Required — instructions + frontmatter
```

### Standard (recommended)

```
my-skill/
├── SKILL.md          # Required — overview and navigation
├── scripts/
│   └── helper.py     # Executable code the agent runs
├── references/
│   └── REFERENCE.md  # Detailed docs loaded on-demand
└── assets/
    └── template.md   # Templates, schemas, data files
```

### Full (complex skills)

```
my-skill/
├── SKILL.md
├── LICENSE.txt
├── scripts/
│   ├── extract.py
│   ├── validate.sh
│   └── transform.js
├── references/
│   ├── REFERENCE.md
│   ├── api-spec.md
│   └── examples.md
├── assets/
│   ├── template.md
│   └── schema.json
└── examples/
    └── sample-output.md
```

### Rules

- **Directory name must match the `name` field** in SKILL.md frontmatter
- Use lowercase letters, numbers, and hyphens only: `my-skill-name`
- No consecutive hyphens (`--`), no leading/trailing hyphens
- Keep it flat — avoid deep nesting inside the skill directory

---

## SKILL.md: The Entrypoint

### Frontmatter

The YAML frontmatter between `---` markers configures how the skill is discovered and loaded.

```yaml
---
name: code-review
description: >
  Reviews code changes for bugs, security issues, and style violations.
  Use when reviewing PRs, diffs, or code snippets. Checks for OWASP
  vulnerabilities, performance anti-patterns, and team style conventions.
license: MIT
compatibility: Requires git
allowed-tools: Read Grep Glob Bash(git:*)
metadata:
  author: your-org
  version: "1.0"
---
```

#### Required Fields

| Field | Constraints | Tips |
|-------|------------|------|
| `name` | 1-64 chars, lowercase alphanumeric + hyphens | Must match directory name |
| `description` | 1-1024 chars | The single most important field. See [Writing Great Descriptions](#writing-great-descriptions) |

#### Optional Fields

| Field | Purpose |
|-------|---------|
| `license` | License name or reference to LICENSE.txt |
| `compatibility` | Environment requirements (e.g., "Requires git, docker, jq") |
| `allowed-tools` | Space-delimited tools pre-approved without user confirmation |
| `metadata` | Arbitrary key-value pairs (author, version, etc.) |

#### Claude Code Extensions (beyond the open standard)

These work in Claude Code but may not be portable to other agents:

| Field | Purpose |
|-------|---------|
| `disable-model-invocation` | `true` = only user can invoke via `/name` (use for destructive actions) |
| `user-invocable` | `false` = hidden from `/` menu, only agent can invoke |
| `context` | `fork` = run in isolated subagent |
| `agent` | Subagent type when `context: fork` (e.g., `Explore`, `Plan`) |
| `model` | Override model for this skill |
| `argument-hint` | Shown during autocomplete: `[issue-number]` |
| `hooks` | Lifecycle hooks scoped to this skill |

#### OpenClaw Extensions

These work in OpenClaw (Pi agent):

| Field | Purpose |
|-------|---------|
| `metadata.openclaw.requires.bins` | Required binaries on PATH |
| `metadata.openclaw.requires.env` | Required environment variables |
| `metadata.openclaw.requires.config` | Required openclaw.json config paths |
| `metadata.openclaw.primaryEnv` | Env var for `skills.entries.<name>.apiKey` |
| `metadata.openclaw.emoji` | Emoji for macOS Skills UI |
| `metadata.openclaw.install` | Installer specs (brew/node/go/uv/download) |
| `command-dispatch` | `tool` = bypass model, dispatch directly to a tool |
| `command-tool` | Tool name for direct dispatch |

### Body Content

After the frontmatter, write markdown instructions. Structure for clarity:

```markdown
---
name: my-skill
description: ...
---

# Brief purpose (1-2 sentences)

## Overview
What this skill does, when to use it.

## Prerequisites
Required tools, files, or context.

## Instructions

### Step 1: Gather Context
Imperative instructions...

### Step 2: Execute
Imperative instructions...

### Step 3: Validate
Imperative instructions...

## Output Format
How to structure results.

## Error Handling
What to do when things fail.

## Resources
- For API details, see [references/api-spec.md](references/api-spec.md)
- Run: `scripts/validate.sh`
```

---

## Writing Great Descriptions

The `description` is **the single most important field**. It's the only thing the agent sees at startup for every skill. The agent uses pure language understanding to match user intent against descriptions — no embeddings, no classifiers, no keyword matching.

### Pattern: What + When

Always include both **what the skill does** and **when to use it**:

```yaml
# ✅ Good — specific, keyword-rich, action-oriented
description: >
  Reviews code changes for bugs, security issues, and style violations.
  Use when reviewing PRs, diffs, or code snippets. Checks for OWASP
  vulnerabilities, performance anti-patterns, and team style conventions.

# ✅ Good — clear trigger conditions
description: >
  Generate or edit images via Gemini 3 Pro Image. Use when the user
  asks to create, modify, or transform images, or when visual output
  is needed.

# ❌ Bad — too vague, no trigger keywords
description: Helps with code.

# ❌ Bad — describes implementation, not usage
description: A Python script that uses the GitHub API.
```

### Tips

- **Include specific keywords** the user might say: "PDF", "deploy", "review", "image"
- **State the trigger explicitly**: "Use when...", "Activate when the user asks to..."
- **Be concrete about capabilities**: "Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs"
- **Keep under 1024 characters** (spec limit), but use most of it
- **Front-load the most important information** — the agent may truncate mentally

---

## Progressive Disclosure

This is the most important architectural principle for skills. Show just enough at each level:

```
Level 1: Frontmatter (~100 tokens)
  └── name + description loaded for ALL skills at startup
  └── This is the "advertisement" — must be precise and keyword-rich

Level 2: SKILL.md body (~500 lines max)
  └── Loaded when the skill is invoked
  └── Core instructions, step-by-step workflow
  └── Keep focused — don't dump everything here

Level 3: Referenced files (on-demand)
  └── scripts/, references/, assets/
  └── Loaded only when the agent needs them
  └── Can be large — API specs, templates, examples
```

### Rules

- **SKILL.md under 500 lines** — put detailed docs in separate referenced files
- **File references one level deep** — SKILL.md → references/api.md ✅, references/api.md → references/deep/detail.md ❌
- **Reference files from SKILL.md explicitly** so the agent knows they exist:
  ```markdown
  ## Resources
  - For complete API details, see [references/api-spec.md](references/api-spec.md)
  - For usage examples, see [references/examples.md](references/examples.md)
  ```

---

## Scripts & Code

Scripts extend skills with executable logic. The agent runs them via Bash/shell tools.

### When to Use Scripts

| Use a script when... | Use plain instructions when... |
|----------------------|-------------------------------|
| Precise data transformation | Conceptual guidance |
| API calls with specific auth/formatting | General workflow steps |
| Complex multi-step operations | Code style conventions |
| Validation with deterministic rules | Creative/judgment tasks |
| Tasks better expressed in code than prose | Explaining *why* to do something |

### Script Best Practices

```bash
#!/usr/bin/env bash
# scripts/validate.sh — Validate deployment readiness
#
# Usage: bash scripts/validate.sh <environment>
# Returns: 0 on success, 1 on failure with diagnostic output

set -euo pipefail

ENV="${1:?Usage: validate.sh <environment>}"

# Validate input
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "ERROR: Environment must be 'staging' or 'production', got '$ENV'" >&2
  exit 1
fi

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found" >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "ERROR: kubectl not found" >&2; exit 1; }

# Do the work
echo "Validating $ENV deployment..."
# ... actual logic ...

echo "OK: All checks passed for $ENV"
```

### Script Rules

1. **Always include a shebang** — `#!/usr/bin/env bash` or `#!/usr/bin/env python3`
2. **Use `set -euo pipefail`** for bash scripts (fail fast, catch errors)
3. **Document usage in a comment header** — the agent reads this
4. **Validate inputs** — check argument count, validate values
5. **Check prerequisites** — `command -v` for required binaries
6. **Output clear error messages to stderr** — `echo "ERROR: ..." >&2`
7. **Exit with meaningful codes** — 0 = success, 1 = failure
8. **Use forward slashes** — never backslashes, even on Windows
9. **Be self-contained** — minimize external dependencies
10. **No magic constants** — explain any non-obvious values

### Python Scripts

```python
#!/usr/bin/env python3
"""Extract data from PDF files.

Usage: python3 scripts/extract.py <input.pdf> [--format json|text]
"""
import sys
import argparse

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Path to PDF file")
    parser.add_argument("--format", choices=["json", "text"], default="text")
    args = parser.parse_args()

    try:
        # ... actual logic ...
        pass
    except FileNotFoundError:
        print(f"ERROR: File not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---

## Security

### Principle of Least Privilege

Only request the tools your skill actually needs:

```yaml
# ✅ Minimal — only what's needed
allowed-tools: Read Grep Glob

# ✅ Scoped bash — only git commands
allowed-tools: Bash(git:*) Read Grep

# ❌ Overly broad — unnecessary surface area
allowed-tools: Bash Read Write Edit Glob Grep WebSearch Task Agent
```

### Security Checklist

- [ ] **Read third-party skills before enabling** — treat as untrusted code
- [ ] **Scope `allowed-tools` narrowly** — don't grant Bash if you only need Read
- [ ] **Use `Bash(command:*)` wildcards** to restrict shell access
- [ ] **Never embed secrets in SKILL.md** — use environment variables
- [ ] **Use `disable-model-invocation: true`** for destructive actions (deploy, delete, send)
- [ ] **Validate all script inputs** — never pass user input directly to shell commands
- [ ] **Prefer sandboxed execution** for untrusted inputs (OpenClaw: see sandboxing docs)

### Secret Management

```yaml
# In SKILL.md — reference env vars, don't hardcode
metadata:
  openclaw:
    requires:
      env: ["MY_API_KEY"]
    primaryEnv: MY_API_KEY
```

```json5
// In openclaw.json — provide secrets via config
{
  skills: {
    entries: {
      "my-skill": {
        enabled: true,
        apiKey: "sk-...",
        env: { MY_API_KEY: "sk-..." }
      }
    }
  }
}
```

---

## Dependencies & Installation

### Best Practice: Minimize Dependencies

The best skills have zero external dependencies. When you must depend on something:

1. **Document it in `compatibility`**:
   ```yaml
   compatibility: Requires git and jq. Python 3.10+ for scripts.
   ```

2. **Check at runtime** in scripts:
   ```bash
   command -v jq >/dev/null 2>&1 || { echo "ERROR: jq is required. Install: brew install jq" >&2; exit 1; }
   ```

3. **For OpenClaw, declare in metadata**:
   ```yaml
   metadata:
     openclaw:
       requires:
         bins: ["jq", "git"]
       install:
         - id: brew
           kind: brew
           formula: jq
           bins: ["jq"]
           label: "Install jq (brew)"
   ```

### Python Dependencies

For Python scripts that need packages:

```bash
#!/usr/bin/env bash
# Ensure dependencies are available
if ! python3 -c "import pdfplumber" 2>/dev/null; then
  echo "Installing pdfplumber..." >&2
  pip3 install --quiet pdfplumber
fi

python3 "$(dirname "$0")/extract.py" "$@"
```

Or use `uv` for faster, isolated installs:
```bash
uvx --from pdfplumber python3 scripts/extract.py "$@"
```

---

## Testing & Validation

### Validation

Use the reference validator:
```bash
npx skills-ref validate ./my-skill
```

This checks:
- SKILL.md exists and has valid frontmatter
- `name` matches directory name
- `name` follows naming conventions
- `description` is present and within limits

### Manual Testing Checklist

1. **Test with multiple models** — Haiku (fast/cheap), Sonnet (balanced), Opus (capable). Skills that work on all three are robust.

2. **Test discovery** — Does the agent invoke your skill when you describe the task naturally, without mentioning the skill name? If not, improve your `description`.

3. **Test at least 3 real scenarios**:
   - Happy path (normal usage)
   - Edge case (unusual input)
   - Error case (missing file, bad input, missing dependency)

4. **Count token usage** — Run with verbose logging. If your skill consumes >5000 tokens of context, it's too large. Split into referenced files.

5. **Test invocation control**:
   - If `disable-model-invocation: true`: verify the agent does NOT auto-invoke
   - If default: verify the agent DOES auto-invoke when relevant

### Evaluation Template

```markdown
## Eval: [skill-name]

### Scenario 1: [Happy path]
- Prompt: "[what you typed]"
- Expected: [what should happen]
- Result: ✅/❌
- Model: [haiku/sonnet/opus]

### Scenario 2: [Edge case]
...

### Scenario 3: [Error case]
...
```

---

## Documentation

### README.md (for the repo/registry)

If publishing to a skill registry (skills.sh, ClawHub, GitHub), include a README:

```markdown
# skill-name

Brief description (same as frontmatter description).

## Installation

### Claude Code
npx skills add owner/repo --skill skill-name

### OpenClaw
clawhub install skill-name

### Manual
cp -r skill-name/ ~/.claude/skills/skill-name/

## What it does

Detailed explanation of capabilities.

## Examples

Show 2-3 real usage examples with prompts and expected behavior.

## Configuration

Any env vars, API keys, or config needed.

## License

MIT (or whatever)
```

### SKILL.md is Not README

- **SKILL.md** = instructions for the *agent* (imperative, step-by-step)
- **README.md** = documentation for the *human* (explanatory, installation, examples)

Don't mix them. The agent doesn't need installation instructions. Humans don't need step-by-step agent workflows.

---

## Platform-Specific Notes

### Claude Code

- Skills live in `.claude/skills/<name>/SKILL.md` (project) or `~/.claude/skills/<name>/SKILL.md` (personal)
- Use `context: fork` + `agent: Explore` for read-only research tasks
- Use `!`backtick`` syntax for dynamic context injection (shell commands run before the skill)
- `$ARGUMENTS`, `$0`, `$1` etc. for argument substitution
- `{baseDir}` resolves to the skill's installation directory

### OpenClaw

- Skills live in `<workspace>/skills/` (highest precedence), `~/.openclaw/skills/` (managed), or bundled
- Use `metadata.openclaw.requires` for gating (bins, env, config)
- Use `command-dispatch: tool` + `command-tool: <name>` for direct tool dispatch
- Skills snapshot at session start; changes take effect on next session (or via watcher)
- For sandboxed agents, ensure required binaries exist inside the container

### Cross-Platform

If you want your skill to work across Claude Code, OpenClaw, Cursor, Codex, and others:

- **Stick to the open standard** — `name`, `description`, `license`, `compatibility`, `metadata`
- **Avoid platform-specific frontmatter** in the base SKILL.md
- **Use `metadata` for platform extensions** with namespaced keys
- **Test on at least two platforms** before claiming cross-platform compatibility

---

## Checklist

Use this before publishing any skill:

### Core Quality
- [ ] `description` is specific, keyword-rich, includes "what" and "when"
- [ ] `description` is under 1024 characters but uses most of the space
- [ ] `name` matches directory name, follows naming rules
- [ ] SKILL.md body is under 500 lines
- [ ] Detailed docs are in separate referenced files
- [ ] Terminology is consistent throughout
- [ ] Examples are concrete, not abstract
- [ ] File references are one level deep (no nested chains)

### Scripts & Code
- [ ] Scripts solve problems precisely (not delegating everything to the agent)
- [ ] Every script has a shebang line
- [ ] Bash scripts use `set -euo pipefail`
- [ ] Error handling is explicit and produces helpful messages
- [ ] No magic constants without explanation
- [ ] Paths use forward slashes only
- [ ] Critical operations include validation steps
- [ ] Prerequisites are checked at runtime

### Security
- [ ] `allowed-tools` is minimally scoped
- [ ] No secrets in SKILL.md or scripts
- [ ] Destructive skills use `disable-model-invocation: true`
- [ ] Script inputs are validated

### Testing
- [ ] Passes `npx skills-ref validate ./my-skill`
- [ ] Tested on at least 2 models (Haiku + Sonnet, or Sonnet + Opus)
- [ ] At least 3 evaluation scenarios (happy path, edge case, error)
- [ ] Agent discovers the skill from natural language (without naming it)
- [ ] Token usage is reasonable (<5000 tokens for SKILL.md)

### Documentation
- [ ] README.md exists with installation instructions (if publishing)
- [ ] SKILL.md has clear step-by-step instructions for the agent
- [ ] Referenced files are documented in SKILL.md

---

## References

- [Agent Skills Specification](https://agentskills.io/specification) — The open standard
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) — Claude Code extensions
- [OpenClaw Skills Docs](https://docs.openclaw.ai/tools/skills) — OpenClaw conventions
- [Anthropic's Example Skills](https://github.com/anthropics/skills) — Official examples
- [Skills.sh](https://skills.sh) — Skills leaderboard and directory
- [ClawHub](https://clawhub.com) — OpenClaw skill registry
- [Deep Dive: Claude Agent Skills](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) — Architecture analysis
- [Anthropic's Complete Guide to Building Skills (PDF)](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) — Official guide
