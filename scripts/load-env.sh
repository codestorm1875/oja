#!/usr/bin/env bash

load_env_file() {
  local env_file="${1:-.env}"

  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}
