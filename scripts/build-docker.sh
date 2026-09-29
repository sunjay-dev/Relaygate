#!/usr/bin/env bash
# Builds the scriptc-based relaygate image (linux/arm64).
# Usage: bash scripts/build-docker.sh [image-tag]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

IMAGE="${1:-relaygate:scriptc}"
PLATFORM="${PLATFORM:-linux/arm64}"

docker build \
  --file Dockerfile.scriptc \
  --platform "${PLATFORM}" \
  --tag "${IMAGE}" \
  .

echo "built ${IMAGE} (${PLATFORM})"
