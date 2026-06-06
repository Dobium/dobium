const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');
c = c.replace(
  '// ── Dry-run ─────────────────────────────────────────────────────────────\\n    if (dryRun) {',
  `if (externalEmails && typeof externalEmails === 'string') {
      const extraList = externalEmails.split(',').map(e => e.trim()).filter(e => e && e.includes('@'));
      extraList.forEach(e => {
        if (!recipients.find(r => r.email === e)) {
          recipients.push({ email: e, username: e.split('@')[0] });
        }
      });
    }

    // ── Dry-run ─────────────────────────────────────────────────────────────
    if (dryRun) {`
);
fs.writeFileSync('backend/server.js', c);
