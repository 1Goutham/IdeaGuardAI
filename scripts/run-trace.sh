#!/usr/bin/env bash
# Run the full pipeline from the command line and print a timestamped trace.
# Uses the providers configured in .env.local (or the environment).
#   npm run trace -- "your idea"
exec node --conditions=react-server --env-file-if-exists=.env.local --import tsx "$(dirname "$0")/trace.mts" "$@"
