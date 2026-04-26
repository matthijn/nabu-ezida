#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --input <dir> --runs <N> [--model <model>] [--temperature <temp>] [--reasoning <effort>] [--chunk <index>]"
  echo ""
  echo "  --input        Directory containing chunk subdirs with request-*.json files"
  echo "  --runs         Number of runs per request file"
  echo "  --model        Model override (default: agent config)"
  echo "  --temperature  Temperature override (default: agent config)"
  echo "  --reasoning    Reasoning effort override (low, medium, high)"
  echo "  --chunk        Only run requests for this chunk (1-indexed, matches dir names)"
  exit 1
}

INPUT=""
RUNS=""
MODEL=""
TEMPERATURE=""
REASONING=""
CHUNK=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input) INPUT="$2"; shift 2 ;;
    --runs) RUNS="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --temperature) TEMPERATURE="$2"; shift 2 ;;
    --reasoning) REASONING="$2"; shift 2 ;;
    --chunk) CHUNK="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

[[ -z "$INPUT" || -z "$RUNS" ]] && usage

INPUT="$(cd "$INPUT" && pwd)"
LOGOS_DIR="$(cd "$(dirname "$0")/../.." && pwd)/hermes-logos"

if [[ ! -d "$LOGOS_DIR/cmd/test" ]]; then
  echo "Error: hermes-logos not found at $LOGOS_DIR"
  exit 1
fi

if [[ -f "$LOGOS_DIR/.env" ]]; then
  set -a
  source "$LOGOS_DIR/.env"
  set +a
fi

MODEL_FLAGS=()
[[ -n "$MODEL" ]] && MODEL_FLAGS+=(--model "$MODEL")
[[ -n "$TEMPERATURE" ]] && MODEL_FLAGS+=(--temperature "$TEMPERATURE")
[[ -n "$REASONING" ]] && MODEL_FLAGS+=(--reasoning "$REASONING")

TOTAL=0
SUCCESS=0
FAILURE=0

CHUNK_FILTER=""
if [[ -n "$CHUNK" ]]; then
  CHUNK_PAD=$(printf "%02d" "$CHUNK")
  CHUNK_FILTER="chunk-${CHUNK_PAD}-"
fi

REQUEST_FILES=()
while IFS= read -r -d '' f; do
  if [[ -n "$CHUNK_FILTER" ]]; then
    parent="$(basename "$(dirname "$f")")"
    [[ "$parent" != "${CHUNK_FILTER}"* ]] && continue
  fi
  REQUEST_FILES+=("$f")
done < <(find "$INPUT" -name 'request*.json' -print0 | sort -z)

if [[ ${#REQUEST_FILES[@]} -eq 0 ]]; then
  echo "No request files found in $INPUT"
  exit 1
fi

RUN_TAG="$(date +%Y%m%d-%H%M%S)"

echo "Found ${#REQUEST_FILES[@]} request file(s), $RUNS run(s) each → runs/${RUN_TAG}"
echo ""

for request in "${REQUEST_FILES[@]}"; do
  chunk_dir="$(dirname "$request")"
  filename="$(basename "$request")"

  # request-anger.json → anger, request.json → all
  dim="${filename#request}"
  dim="${dim%.json}"
  dim="${dim#-}"
  [[ -z "$dim" ]] && dim="all"

  runs_dir="$chunk_dir/runs/${RUN_TAG}"
  mkdir -p "$runs_dir"

  for run in $(seq 1 "$RUNS"); do
    TOTAL=$((TOTAL + 1))
    out_file="$runs_dir/${dim}-${run}.json"
    meta_file="$runs_dir/${dim}-${run}.meta.txt"

    echo -n "  $(basename "$chunk_dir")/${dim} run $run ... "

    if (cd "$LOGOS_DIR" && go run ./cmd/test ${MODEL_FLAGS[@]+"${MODEL_FLAGS[@]}"} deep-analysis "$request") \
        >"$out_file" 2>"$meta_file"; then
      SUCCESS=$((SUCCESS + 1))
      echo "ok"
    else
      FAILURE=$((FAILURE + 1))
      echo "FAIL"
    fi
  done
done

echo ""
echo "Done: $TOTAL calls, $SUCCESS succeeded, $FAILURE failed"
