# Anthropic Skills Guide — Key Takeaways

> Summary of [The Complete Guide to Building Skills for Claude](./anthropic-skills-guide.pdf)

**Source:** Anthropic Official Documentation (January 2026)

---

## What Is a Skill?

A skill is a folder containing:
- **SKILL.md** (required): Instructions in Markdown with YAML frontmatter
- **scripts/** (optional): Executable code (Python, Bash, etc.)
- **references/** (optional): Documentation loaded as needed  
- **assets/** (optional): Templates, fonts, icons used in output

**Key principle:** Skills use **progressive disclosure** — minimize token usage while maintaining expertise.

---

## Three-Level System (Progressive Disclosure)

1. **YAML frontmatter** — Always loaded in Claude's system prompt (~100 tokens)
   - Just enough for Claude to know when to use the skill
   
2. **SKILL.md body** — Loaded when Claude thinks the skill is relevant
   - Full instructions and guidance
   
3. **Linked files** (references/, assets/) — Loaded only as needed
   - Additional documentation Claude discovers on demand

---

## The Description Field (MOST IMPORTANT)

**Structure:** `[What it does] + [When to use it] + [Key capabilities]`

### ✅ Good Examples

```yaml
description: Analyzes Figma design files and generates developer handoff documentation. Use when user uploads .fig files, asks for "design specs", "component documentation", or "design-to-code handoff".
```

```yaml
description: Manages Linear project workflows including sprint planning, task creation, and status tracking. Use when user mentions "sprint", "Linear tasks", "project planning", or asks to "create tickets".
```

### ❌ Bad Examples

```yaml
description: Helps with projects.  # Too vague
```

```yaml
description: Creates sophisticated multi-page documentation systems.  # Missing triggers
```

```yaml
description: Implements the Project entity model with hierarchical relationships.  # Too technical, no user triggers
```

---

## Three Common Skill Categories

### 1. Document & Asset Creation
**Used for:** Creating consistent, high-quality output (documents, presentations, code, designs)

**Key techniques:**
- Embedded style guides and brand standards
- Template structures for consistent output
- Quality checklists before finalizing
- Uses Claude's built-in capabilities (no external tools required)

**Example:** `frontend-design` skill

---

### 2. Workflow Automation
**Used for:** Multi-step processes that benefit from consistent methodology

**Key techniques:**
- Step-by-step workflow with validation gates
- Templates for common structures
- Built-in review and improvement suggestions
- Iterative refinement loops

**Example:** `skill-creator` skill

---

### 3. MCP Enhancement
**Used for:** Workflow guidance to enhance tool access an MCP server provides

**Key techniques:**
- Coordinates multiple MCP calls in sequence
- Embeds domain expertise
- Provides context users would otherwise need to specify
- Error handling for common MCP issues

**Example:** Sentry's `sentry-code-review` skill

---

## Success Criteria

### Quantitative Metrics (Aspirational)
- ✅ Skill triggers on **90% of relevant queries**
- ✅ Completes workflow in **X tool calls** (benchmark with/without skill)
- ✅ **0 failed API calls** per workflow

### Qualitative Metrics
- ✅ Users don't need to prompt Claude about next steps
- ✅ Workflows complete without user correction
- ✅ Consistent results across sessions

**Note:** These are rough benchmarks, not precise thresholds. Anthropic is developing more robust measurement tools.

---

## File Structure Rules

```
your-skill-name/
├── SKILL.md          # Required - exact spelling (case-sensitive)
├── scripts/          # Optional - executable code
│   ├── process_data.py
│   └── validate.sh
├── references/       # Optional - documentation
│   ├── api-guide.md
│   └── examples/
└── assets/           # Optional - templates, etc.
    └── report-template.md
```

### Critical Rules
- **SKILL.md naming:** Must be exactly `SKILL.md` (case-sensitive)
- **Folder naming:** Use kebab-case: `notion-project-setup` ✅
  - No spaces: `Notion Project Setup` ❌
  - No underscores: `notion_project_setup` ❌
  - No capitals: `NotionProjectSetup` ❌
- **No README.md** inside your skill folder (docs go in SKILL.md or references/)

---

## YAML Frontmatter Requirements

### Minimal Required Format
```yaml
---
name: your-skill-name
description: What it does. Use when user asks to [specific phrases].
---
```

### Field Requirements

**name** (required):
- kebab-case only
- No spaces or capitals
- Should match folder name

**description** (required):
- MUST include BOTH:
  - What the skill does
  - When to use it (trigger conditions)
- Under 1024 characters
- No XML tags (< or >)
- Include specific tasks users might say
- Mention file types if relevant

**license** (optional):
- Use if making skill open source
- Common: MIT, Apache-2.0

**metadata** (optional):
- Any custom key-value pairs
- Suggested: `author`, `version`, `mcp-server`

### Security Restrictions (Forbidden)
- XML angle brackets (< >)
- Skills with "claude" or "anthropic" in name (reserved)

**Why:** Frontmatter appears in Claude's system prompt. Malicious content could inject instructions.

---

## Writing Effective Instructions

### Recommended Structure

```markdown
---
name: your-skill
description: [...]
---

# Your Skill Name

## Instructions

### Step 1: [First Major Step]
Clear explanation of what happens.

Examples

Example 1: [common scenario]
User says: "Set up a new marketing campaign"
Actions:
1. Fetch existing campaigns via MCP
2. Create new campaign with provided parameters
Result: Campaign created with confirmation link

Troubleshooting

Error: [Common error message]
Cause: [Why it happens]
Solution: [How to fix]
```

### Best Practices for Instructions

**✅ Be Specific and Actionable**
```markdown
Run `python scripts/validate.py --input {filename}` to check data format.
If validation fails, common issues include:
- Missing required fields (add them to the CSV)
- Invalid date formats (use YYYY-MM-DD)
```

**❌ Avoid Vague Instructions**
```markdown
Validate the data before proceeding.
```

**Include Error Handling**
```markdown
## Common Issues
### MCP Connection Failed
If you see "Connection refused":
1. Verify MCP server is running: Check Settings > Extensions
2. Confirm API key is valid
3. Try reconnecting: Settings > Extensions > [Your Service] > Reconnect
```

**Use Progressive Disclosure**
- Keep SKILL.md focused on core instructions
- Move detailed documentation to `references/` and link to it
- Keep SKILL.md under 5,000 words

---

## Testing Approach

### 1. Triggering Tests
**Goal:** Ensure your skill loads at the right times.

**Test cases:**
- ✅ Triggers on obvious tasks
- ✅ Triggers on paraphrased requests
- ❌ Doesn't trigger on unrelated topics

Example:
```
Should trigger:
- "Help me set up a new ProjectHub workspace"
- "I need to create a project in ProjectHub"
- "Initialize a ProjectHub project for Q4 planning"

Should NOT trigger:
- "What's the weather in San Francisco?"
- "Help me write Python code"
- "Create a spreadsheet"
```

### 2. Functional Tests
**Goal:** Verify the skill produces correct outputs.

**Test cases:**
- Valid outputs generated
- API calls succeed
- Error handling works
- Edge cases covered

### 3. Performance Comparison
**Goal:** Prove the skill improves results vs. baseline.

**Without skill:**
- User provides instructions each time
- 15 back-and-forth messages
- 3 failed API calls requiring retry
- 12,000 tokens consumed

**With skill:**
- Automatic workflow execution
- 2 clarifying questions only
- 0 failed API calls
- 6,000 tokens consumed

---

## Iteration Strategy

> **Pro Tip:** "The most effective skill creators iterate on a single challenging task until Claude succeeds, then extract the winning approach into a skill."

Don't try to cover everything — nail one workflow, then expand.

### Undertriggering Signals
- Skill doesn't load when it should
- Users manually enabling it
- Support questions about when to use it

**Solution:** Add more detail and keywords to description

### Overtriggering Signals
- Skill loads for irrelevant queries
- Users disabling it
- Confusion about purpose

**Solution:** Add negative triggers, be more specific

### Execution Issues
- Inconsistent results
- API call failures
- User corrections needed

**Solution:** Improve instructions, add error handling

---

## Common Patterns

### Pattern 1: Sequential Workflow Orchestration
**Use when:** Multi-step processes in a specific order.

### Pattern 2: Multi-MCP Coordination
**Use when:** Workflows span multiple services.

### Pattern 3: Iterative Refinement
**Use when:** Output quality improves with iteration.

### Pattern 4: Context-Aware Tool Selection
**Use when:** Same outcome, different tools depending on context.

### Pattern 5: Domain-Specific Intelligence
**Use when:** Your skill adds specialized knowledge beyond tool access.

---

## Troubleshooting

### Skill won't upload
**Error:** "Could not find SKILL.md in uploaded folder"

**Solution:**
- Rename to `SKILL.md` (case-sensitive)
- Verify with: `ls -la` should show SKILL.md

---

### Invalid frontmatter
**Common mistakes:**
```yaml
# Wrong - missing delimiters
name: my-skill
description: Does things

# Wrong - unclosed quotes
name: my-skill
description: "Does things

# Correct
---
name: my-skill
description: Does things
---
```

---

### Skill doesn't trigger
**Fix:** Revise your description field.

**Quick checklist:**
- Is it too generic? ("Helps with projects" won't work)
- Does it include trigger phrases users would actually say?
- Does it mention relevant file types if applicable?

**Debugging approach:**
Ask Claude: "When would you use the [skill name] skill?" Claude will quote the description back.

---

### Instructions not followed
**Common causes:**

1. **Instructions too verbose**
   - Keep instructions concise
   - Use bullet points and numbered lists
   - Move detailed reference to separate files

2. **Critical instructions buried**
   - Put critical instructions at the top
   - Use `## Important` or `## Critical` headers
   - Repeat key points if needed

3. **Model "laziness"**
   Add explicit encouragement:
   ```markdown
   ## Performance Notes
   - Take your time to do this thoroughly
   - Quality is more important than speed
   - Do not skip validation steps
   ```

**Advanced:** For critical validations, bundle a script that performs checks programmatically rather than relying on language instructions. Code is deterministic; language interpretation isn't.

---

### Large context issues
**Symptoms:** Skill seems slow or responses degraded

**Solutions:**
1. Optimize SKILL.md size
   - Move detailed docs to `references/`
   - Link to references instead of inline
   - Keep SKILL.md under 5,000 words

2. Reduce enabled skills
   - Evaluate if you have more than 20-50 skills enabled
   - Recommend selective enablement
   - Consider skill "packs" for related capabilities

---

## Using the skill-creator Skill

The `skill-creator` skill can help you build and iterate on skills (available in Claude.ai via plugin directory or download for Claude Code).

**Creating skills:**
- Generate skills from natural language descriptions
- Produce properly formatted SKILL.md with frontmatter
- Suggest trigger phrases and structure

**Reviewing skills:**
- Flag common issues (vague descriptions, missing triggers, structural problems)
- Identify potential over/under-triggering risks
- Suggest test cases based on the skill's stated purpose

**Iterative improvement:**
After using your skill and encountering edge cases or failures, bring those examples back to skill-creator:
```
"Use the issues & solution identified in this chat to improve how the skill handles [specific edge case]"
```

**Note:** skill-creator helps design and refine skills but does not execute automated test suites or produce quantitative evaluation results.

---

## Distribution (Current Model - January 2026)

### Individual Users
1. Download the skill folder
2. Zip the folder (if needed)
3. Upload to Claude.ai via Settings > Capabilities > Skills
4. Or place in Claude Code skills directory

### Organizations
- Admins can deploy skills workspace-wide
- Automatic updates
- Centralized management

### Recommended Approach Today

1. **Host on GitHub**
   - Public repo for open-source skills
   - Clear README with installation instructions
   - Example usage and screenshots

2. **Document in Your MCP Repo**
   - Link to skills from MCP documentation
   - Explain the value of using both together
   - Provide quick-start guide

3. **Create an Installation Guide**

---

## Publishing/Listing Checklist

**Before listing your skill publicly** (GitHub, marketplace, sharing with others):

### Quality & Testing
- [ ] Tested with 3+ real-world scenarios (happy path, edge case, error)
- [ ] Tested on 2+ models (minimum Haiku + Sonnet)
- [ ] Skill triggers on 90%+ of relevant queries
- [ ] Skill does NOT trigger on unrelated topics
- [ ] Zero failed API calls in test runs
- [ ] Consistent results across multiple sessions

### Documentation
- [ ] README.md exists at repo root (for humans visiting GitHub)
- [ ] Installation instructions are clear and tested
- [ ] Example usage with screenshots/output samples
- [ ] All dependencies documented (binaries, API keys, MCP servers)
- [ ] Compatibility notes (macOS/Linux/Windows, required versions)

### Security & Privacy
- [ ] No secrets/API keys hardcoded in files
- [ ] `allowed-tools` scoped as narrowly as possible
- [ ] Scripts validate all inputs
- [ ] No personal data in examples/templates
- [ ] License file included (MIT, Apache-2.0, etc.)

### Code Quality
- [ ] All scripts have shebangs and error handling
- [ ] Scripts use `set -euo pipefail` (bash) or equivalent
- [ ] Meaningful error messages to stderr
- [ ] Scripts support `--help` flag
- [ ] Python scripts use PEP 723 for dependencies (if applicable)

### Metadata & Discoverability
- [ ] `description` is keyword-rich and trigger-specific
- [ ] `metadata.author` and `metadata.version` set
- [ ] Tags/categories appropriate for discovery
- [ ] Name is clear and searchable
- [ ] No naming conflicts with existing popular skills

### User Experience
- [ ] First-time user can accomplish task without reading docs
- [ ] Error messages guide user to solution
- [ ] Skill doesn't require manual intervention mid-workflow
- [ ] SKILL.md under 5,000 words (detailed docs in references/)

### Legal & Attribution
- [ ] License compatible with dependencies
- [ ] Attribution for any borrowed code/patterns
- [ ] No trademark violations in skill name
- [ ] Compliance with API terms of service (if calling external APIs)

---

## Quick Checklist

### Before you start
- [ ] Identified 2-3 concrete use cases
- [ ] Tools identified (built-in or MCP)
- [ ] Reviewed this guide and example skills
- [ ] Planned folder structure

### During development
- [ ] Folder named in kebab-case
- [ ] SKILL.md file exists (exact spelling)
- [ ] YAML frontmatter has `---` delimiters
- [ ] `name` field: kebab-case, no spaces, no capitals
- [ ] `description` includes WHAT and WHEN
- [ ] No XML tags (< >) anywhere
- [ ] Instructions are clear and actionable
- [ ] Error handling included
- [ ] Examples provided
- [ ] References clearly linked

### Before upload
- [ ] Tested triggering on obvious tasks
- [ ] Tested triggering on paraphrased requests
- [ ] Verified doesn't trigger on unrelated topics
- [ ] Functional tests pass
- [ ] Tool integration works (if applicable)
- [ ] Compressed as .zip file

### After upload
- [ ] Test in real conversations
- [ ] Monitor for under/over-triggering
- [ ] Collect user feedback
- [ ] Iterate on description and instructions
- [ ] Update version in metadata

---

## Resources

**Official Documentation:**
- [Anthropic Best Practices Guide](https://docs.anthropic.com/en/docs/build-with-claude/agent-skills)
- [Skills Documentation](https://docs.anthropic.com/en/docs/skills)
- [API Reference](https://docs.anthropic.com/en/api)
- [MCP Documentation](https://modelcontextprotocol.io)

**Blog Posts:**
- [Introducing Agent Skills](https://www.anthropic.com/news/introducing-agent-skills)
- [Engineering Blog: Equipping Agents for the Real World](https://www.anthropic.com/research/equipping-agents)

**Example Skills:**
- [Public Skills Repository](https://github.com/anthropics/skills)
- [Document Skills](https://github.com/anthropics/skills/tree/main/document-skills)
- [Partner Skills Directory](https://docs.anthropic.com/en/docs/build-with-claude/agent-skills#partner-skills)

---

**Last Updated:** February 2026
