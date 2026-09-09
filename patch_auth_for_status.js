import fs from 'fs';
let content = fs.readFileSync('server/routes/adminDbStatus.js', 'utf8');

// The error shows Authentication Required, so requireAdmin is active, but we should make sure we can at least view public DB status.
// Actually wait, requireAdmin is supposed to be there. 
// If it says "Authentication required" when we ran curl, it means the API is up and running and the server is fully started.
