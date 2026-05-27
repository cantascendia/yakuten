#!/usr/bin/env bash
# safe-grep — properly handle grep exit codes (0=match, 1=no-match, 2+=error)
#
# REVIEW-QUEUE #6 fix: replaces `grep ... || true` which silently swallows real
# errors (file not found, regex parse failure, OOM) and treats them as "no match".
# Real silent-failure surface — if forbidden-paths.txt disappears, gate goes green.
#
# Usage:
#   safe-grep.sh -E "$pattern" [files...]   # accepts stdin if no files
#   exit code: 0 if match found, 1 if no match, 2 if real error
#   stdout: matching lines (empty if no match)
set -uo pipefail
grep "$@"
rc=$?
case $rc in
  0|1) exit 0 ;;       # match (stdout written) or no-match (empty stdout) — both OK
  *)
    echo "ERROR: grep failed with exit code $rc (not 0/1 — real error, not 'no match')" >&2
    exit "$rc"
    ;;
esac
