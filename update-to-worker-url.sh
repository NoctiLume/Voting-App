#!/bin/bash
# Update frontend to call worker URL directly

WORKER_URL="https://voting-app-api.shigoto.workers.dev"

echo "Updating frontend to use worker URL: $WORKER_URL"

# Update admin.js
sed -i "s|fetch(\"/api/login\"|fetch(\"${WORKER_URL}/login\"|g" public/admin/admin.js

# Update calon.js
sed -i "s|fetch(\"/api/uploadPhoto\"|fetch(\"${WORKER_URL}/uploadPhoto\"|g" public/pageadmin/calon/calon.js
sed -i "s|fetch(\"/api/saveCandidate\"|fetch(\"${WORKER_URL}/saveCandidate\"|g" public/pageadmin/calon/calon.js
sed -i "s|fetch(\"/api/getCandidate|fetch(\"${WORKER_URL}/getCandidate|g" public/pageadmin/calon/calon.js
sed -i "s|fetch(\"/api/deleteCandidate\"|fetch(\"${WORKER_URL}/deleteCandidate\"|g" public/pageadmin/calon/calon.js

# Update suara.html
sed -i "s|fetch('/api/getVotes')|fetch('${WORKER_URL}/getVotes')|g" public/pageadmin/suara.html
sed -i "s|fetch(\`/api/getCandidate|fetch(\`${WORKER_URL}/getCandidate|g" public/pageadmin/suara.html
sed -i "s|fetch('/api/resetVotes'|fetch('${WORKER_URL}/resetVotes'|g" public/pageadmin/suara.html

# Update pilihcalon.html
sed -i "s|fetch('/api/submitVote')|fetch('${WORKER_URL}/submitVote')|g" public/peserta/pilihcalon.html

echo "Done! All API calls now use the worker URL directly."

