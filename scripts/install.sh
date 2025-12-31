#!/usr/bin/env bash
# Usage:
#   chmod +x ./scripts/install.sh
#   ./scripts/install.sh
set -euo pipefail;

mkdir -p ~/.config/virtual-macropad/
cp ./configs/settings.json ~/.config/virtual-macropad/settings.json
cp ./configs/macros.json ~/.config/virtual-macropad/macros.json
