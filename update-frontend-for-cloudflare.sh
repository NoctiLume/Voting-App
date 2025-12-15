#!/bin/bash
# Script to update frontend API calls for Cloudflare deployment
# This adds /api prefix to all API endpoints

echo "Updating frontend for Cloudflare deployment..."

# Update admin.js
sed -i 's|fetch("/login"|fetch("/api/login"|g' public/admin/admin.js

# Update calon.js
sed -i 's|fetch("/uploadPhoto"|fetch("/api/uploadPhoto"|g' public/pageadmin/calon/calon.js
sed -i 's|fetch("/saveCandidate"|fetch("/api/saveCandidate"|g' public/pageadmin/calon/calon.js
sed -i 's|fetch("/getCandidate|fetch("/api/getCandidate|g' public/pageadmin/calon/calon.js
sed -i 's|fetch("/deleteCandidate"|fetch("/api/deleteCandidate"|g' public/pageadmin/calon/calon.js

# Update suara.html
sed -i 's|fetch('\''/getVotes'\'')|fetch('\''/api/getVotes'\'')|g' public/pageadmin/suara.html
sed -i 's|fetch(\`/getCandidate|fetch(\`/api/getCandidate|g' public/pageadmin/suara.html
sed -i 's|fetch('\''/resetVotes'\''|fetch('\''/api/resetVotes'\''|g' public/pageadmin/suara.html

# Update pilihcalon.html
sed -i 's|fetch('\''/submitVote'\'')|fetch('\''/api/submitVote'\'')|g' public/peserta/pilihcalon.html

echo "Done! All API endpoints now use /api prefix."

