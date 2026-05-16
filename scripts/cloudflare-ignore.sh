#!/bin/bash

# Cloudflare Pages Ignore Command
# This script ensures that Cloudflare's native Git integration does NOT build the project,
# because GitHub Actions is configured to handle the deployment via Wrangler (Direct Upload).

if [ "$CF_PAGES" == "1" ] && [ "$GITHUB_ACTIONS" != "true" ]; then
  echo "Detected Cloudflare native build environment."
  echo "Skipping build because GitHub Actions is the authoritative deployment source."
  # Exit with 0 to indicate that the build should be IGNORED.
  exit 0
fi

# Exit with 1 to indicate that the build should PROCEED (used when running in other environments).
exit 1
