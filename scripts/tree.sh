#!/usr/bin/env bash
# tree.sh – Generate Tree.md ignoring node_modules, .git, package-lock.json and Tree.md
# Recursively list the current directory structure into Tree.md as markdown.
# Usage:
#   chmod +x ./scripts/tree.sh
#   ./scripts/tree.sh ./    # writes tree.md in current directory

set -euo pipefail;

BASE_DIR="${1:-.}";
OUTPUT_FILE="Tree.md";

# Ensure base dir exists
if [ ! -d "${BASE_DIR}" ];
then
  echo "Error: '${BASE_DIR}' is not a directory." >&2;
  exit 1;
fi;

# Normalize path
BASE_DIR="$(cd "${BASE_DIR}" && pwd)";
cd "${BASE_DIR}";

{
  echo "# Directory Tree";
  echo;
  # echo "---";
  # echo;
  # echo "## [PocketDimension – Markdown File Index](FileIndex.md)";
  # echo;
  echo "---";
  echo;
  echo "_Base path: \`${BASE_DIR}\`_";
  echo;
  echo '```';
  echo "./";

  while IFS= read -r entry
  do
    rel="${entry#./}";

    IFS='/' read -r -a parts <<< "${rel}";
    depth=$(( ${#parts[@]} - 1 ));
    indent="";

    if [ "${depth}" -gt 0 ];
    then
      for ((i=0; i<depth; i++))
      do
        indent="${indent}  ";
      done;
    fi;

    name="${parts[$(( ${#parts[@]} - 1 ))]}";

    if [ -d "${entry}" ];
    then
      name="${name}/";
    fi;

    printf "%s%s\n" "${indent}" "${name}";
  done < <(
    find . -mindepth 1 \
      \( -path "./node_modules" -o -path "./.git" -o -path "./CodeDocumentation/jsdoc" -o -path "./CodeDocumentation/pydoc" -o -path "./.venv" -o -path "./ceres-solver-2.2.0" -o -path "./colmap" -o -path "./opencv" -o -path "./opencv_contrib" -o -path "./OpenImageIO" -o -path "./openMVS" -o -path "./vcglib" -o -path "./colmap" -o -path "./dist" \) -prune -o \
      -name "package-lock.json" -prune -o \
      -name "Tree.md" -prune -o \
      -print \
      | sort
  );

  echo '```';
} > "${OUTPUT_FILE}";

echo "Wrote markdown tree to ${BASE_DIR}/${OUTPUT_FILE}";