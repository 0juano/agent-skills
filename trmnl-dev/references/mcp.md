# TRMNL Per-Plugin MCP — verified behavior

The MCP key (`ps_mcp_…`) is created from a saved private plugin's settings page
(right side, after clicking Save). It is scoped to **that one plugin**.

## Scope — what it can and cannot do

Can: read/write markup for all four sizes, read/write plugin settings, read
merge variables (+ inferred schema), read plugin logs, search recipes and pull
recipe markup, search TRMNL API docs, read design-system guides.

Cannot: control devices, playlists, or battery; advance screens; take
screenshots; render previews; reveal the plugin UUID or webhook URL. For any
of those, use the account API (`Authorization: Bearer user_…`) or the web UI.

## Transport

`https://trmnl.com/mcp?api_key=${TRMNL_MCP_API_KEY}` is **stateless JSON-RPC
over HTTP**. The `api_key` query param is the entire auth story — no
`initialize` handshake or session is required. `tools/list` and `tools/call`
work as bare POSTs.

MCP-capable clients can also use it declaratively:

```json
{
  "mcpServers": {
    "trmnl": {
      "type": "http",
      "url": "https://trmnl.com/mcp?api_key=${TRMNL_MCP_API_KEY}"
    }
  }
}
```

Keep the `${…}` placeholder in the committed file; put the real key in the
environment.

## Tool inventory (14 tools)

Names over MCP are **PascalCase + `Tool` suffix**. The in-app editor agent uses
different snake_case names for the same operations; calling those over MCP
returns `Tool not found`.

| MCP tool | In-app equivalent | Purpose |
|---|---|---|
| `IntegrationsShowTool` | `show_integration` | plugin name, strategy, settings, framework version |
| `IntegrationsWriteSettingsTool` | `write_settings` | update writable settings |
| `IntegrationsLogsTool` | `show_logs` | plugin logs / render health |
| `MergeVariablesShowTool` | `show_merge_variables` | current merge vars + inferred schema |
| `MarkupsListSizesTool` | `list_markup_sizes` | which sizes have content |
| `MarkupsReadTool` | `read_markup` | read markup for a size |
| `MarkupsWriteTool` | `write_markup` | write markup for a size (**overwrites live**) |
| `RecipesSearchTool` | — | search published recipes |
| `RecipesPullMarkupTool` | `pull_recipe_markup` | pull a recipe's markup by id |
| `APIEndpointsSearchTool` | `search_api_endpoints` | search TRMNL API docs |
| `DesignSystemReferenceTool` | — | design system reference |
| `DesignSystemTemplateGuideTool` | — | template guide sections |
| `AsyncStartTool` / `AsyncResultTool` | — | dispatch/collect long-running calls |

## Direct HTTP recipes

Works even when a client doesn't surface the MCP tools natively:

```bash
URL="https://trmnl.com/mcp?api_key=${TRMNL_MCP_API_KEY}"

# List tools — confirms the key is live and correctly scoped
curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data-binary '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Read current full-size markup
curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data-binary '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"MarkupsReadTool","arguments":{"size":"markup_full"}}}'

# Write markup — note the argument name is "content", NOT "markup"
jq -n --arg c "$(cat template.liquid)" \
  '{jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"MarkupsWriteTool",arguments:{size:"markup_full",content:$c}}}' |
curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data-binary @-
```

## Gotchas (each one cost a debugging session)

- **Headers as literal `-H` flags.** Stuffing headers into a shell variable and
  expanding it produced JSON-RPC `Parse error` responses.
- **Strip newlines from keychain-sourced keys**: `tr -d '\n'` before the key
  goes into the URL, or auth fails mysteriously.
- **`MarkupsWriteTool` takes `{size, content}`.** Passing `markup` instead of
  `content` returns `-32603 Internal error` with no hint.
- **Results are a Ruby-hash-style string, not JSON** — unquoted keys, e.g.
  `{size: "markup_full", markup: "<escaped>"}`. Extract the `markup: "…"` value
  and JSON-decode just that string. The markup itself has `\n`, `\"`, `\\`
  escapes — unescape before diffing or every readback looks like a mismatch.
- **Writes are blind.** There is no screenshot/preview/validate tool on this
  surface (those exist only in the in-app editor agent). Verify visually in the
  editor previewer or an offline harness after every write.
- **"Missing title_bar include" warning on save** is emitted every time markup
  has no `title_bar` — expected when that's a deliberate design choice.

## Safe write workflow

```text
1. Load TRMNL_MCP_API_KEY from the environment/keychain (strip trailing newline).
2. tools/list → confirm the 14 tools respond (key is live).
3. IntegrationsShowTool → confirm you're on the plugin you think you're on.
4. MergeVariablesShowTool BEFORE any markup write — know the data shape
   the template must render.
5. MarkupsReadTool → unescape → diff against your local source file.
   If the live copy has changes your file lacks, mirror them back first —
   MarkupsWriteTool overwrites, it does not merge.
6. Back up the live markup, then write the smallest change.
7. Read back, unescape, compare === with what you sent.
8. Verify visually (editor previewer / offline harness), then force refresh.
```

Keep one local template file as the single source of truth and treat the live
markup as a deploy target, not an editing surface.
