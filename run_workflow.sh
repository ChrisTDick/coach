#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Running intervals.icu download workflow ==="
npx ts-node src/download-data.ts

echo "=== Combining data for LLM output ==="
python3 src/combine_data.py

echo "=== Workflow finished ==="
