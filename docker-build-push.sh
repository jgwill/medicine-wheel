#!/bin/sh
set -e

TAG="${1:-app}"
IMAGE="jgwill/medicine-wheel:${TAG}"

echo "🐳 Building ${IMAGE}..."
docker build -t "${IMAGE}" .

echo "📤 Pushing ${IMAGE}..."
docker push "${IMAGE}"

echo "✅ Done: ${IMAGE}"
echo "Run with:"
echo "  docker run --rm -p 8040:8040 -v /abs/path/to/project/.mw/store:/data/store ${IMAGE}"
