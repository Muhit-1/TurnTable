#!/bin/sh
# Usage: scripts/scaffold-entry.sh <id> <ComponentName> "<Title>"
# Creates allgames/<id>/index.html and src/games/<id>/main.tsx for a game.
set -e
id=$1; comp=$2; title=$3
mkdir -p "allgames/$id" "src/games/$id"
cat > "allgames/$id/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$title — TurnTable</title>
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/games/$id/main.tsx"></script>
</body>
</html>
EOF
cat > "src/games/$id/main.tsx" <<EOF
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/index.css';
import $comp from './$comp';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <$comp />
  </StrictMode>,
);
EOF
