#!/usr/bin/env bash
set -euo pipefail

THEATRON_DIR="$(cd "$(dirname "$0")/.." && pwd)"

export BENCH_CWD="$PWD"
cd "$THEATRON_DIR"
exec npx tsx scripts/bench-run-pipeline.ts "$@"
