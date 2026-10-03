#!/usr/bin/env bash
# Run the evaluation suite against the providers configured in .env.local (or the environment).
#   npm run eval -- [--only a,b] [--save-baseline]
exec node --conditions=react-server --env-file-if-exists=.env.local --import tsx "$(dirname "$0")/eval.mts" "$@"
