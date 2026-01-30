#!/usr/bin/env bash
# Deploy an HTML file or directory to EdgeOne Pages via MCP endpoint.
# Usage: deploy.sh <path> [--slug name]
# Returns the public URL on success.

set -euo pipefail

MCP_ENDPOINT="${EDGEONE_MCP_ENDPOINT:-https://mcp-on-edge.edgeone.app/mcp-server}"

usage() {
  echo "Usage: deploy.sh <file-or-dir> [--slug name]"
  echo "  <file-or-dir>  Path to an HTML file or directory containing index.html"
  echo "  --slug name    Optional: ignored (reserved for future use)"
  exit 1
}

[[ $# -lt 1 ]] && usage

INPUT="$1"
shift

# Resolve the HTML file
if [[ -d "$INPUT" ]]; then
  HTML_FILE="$INPUT/index.html"
  [[ -f "$HTML_FILE" ]] || { echo "Error: No index.html found in $INPUT" >&2; exit 1; }
elif [[ -f "$INPUT" ]]; then
  HTML_FILE="$INPUT"
else
  echo "Error: $INPUT not found" >&2
  exit 1
fi

# Read and JSON-encode the HTML content
HTML_JSON=$(python3 -c 'import sys, json; print(json.dumps(sys.stdin.read()))' < "$HTML_FILE")

# Deploy via MCP JSON-RPC call
RESPONSE=$(curl -sf -X POST "$MCP_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"deploy-html\",\"arguments\":{\"value\":$HTML_JSON}}}")

# Extract URL from response
URL=$(echo "$RESPONSE" | python3 -c 'import sys,json; r=json.load(sys.stdin); print(r["result"]["content"][0]["text"])')

echo "$URL"
