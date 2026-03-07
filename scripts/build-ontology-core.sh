#!/bin/bash

# Build the ontology-core package
cd /vercel/share/v0-project/src/ontology-core

echo "Building medicine-wheel-ontology-core..."
npx tsc

if [ $? -eq 0 ]; then
  echo "✓ Successfully built medicine-wheel-ontology-core"
  exit 0
else
  echo "✗ Failed to build medicine-wheel-ontology-core"
  exit 1
fi
