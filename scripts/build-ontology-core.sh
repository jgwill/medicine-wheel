#!/bin/bash

# Build the ontology-core package relative to the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

cd "$PROJECT_ROOT/src/ontology-core"

echo "Building medicine-wheel-ontology-core..."
npx tsc

if [ $? -eq 0 ]; then
  echo "✓ Successfully built medicine-wheel-ontology-core"
  exit 0
else
  echo "✗ Failed to build medicine-wheel-ontology-core"
  exit 1
fi
