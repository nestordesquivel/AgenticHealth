#!/bin/sh
# Node is installed locally at ~/.local/node-install (it was not on the system PATH).
export PATH="$HOME/.local/node-install/bin:$PATH"
cd "$(dirname "$0")/dinner-agent" || exit 1
exec npm run dev
