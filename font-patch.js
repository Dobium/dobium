const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

c = c.replace(
  `<style>
  h1, h2, h3 { font-family: 'Cabinet Grotesk', 'Inter', Arial, sans-serif !important; }
  body, p, a, div, td { font-family: 'Inter', Arial, Helvetica, sans-serif; }
</style>`,
  `<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,900&display=swap');
  h1, h2, h3 { font-family: 'Cabinet Grotesk', 'Inter', Arial, sans-serif !important; }
  body, p, a, div, td { font-family: 'Inter', Arial, Helvetica, sans-serif; }
</style>`
);

// Add inline font-family to all text elements
c = c.replace(
  '<p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.85;">${safeBody}</p>',
  '<p style="margin:0;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:14px;color:#94a3b8;line-height:1.85;">${safeBody}</p>'
);

c = c.replace(
  '<p style="margin:0 0 4px;font-size:11px;color:#334155;">© ${year} Dobium &middot; All rights reserved.</p>',
  '<p style="margin:0 0 4px;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:11px;color:#334155;">© ${year} Dobium &middot; All rights reserved.</p>'
);

c = c.replace(
  '<p style="margin:0;font-size:10px;color:#1e293b;line-height:1.6;">You received this because you are a registered user of Dobium Prediction Markets.</p>',
  '<p style="margin:0;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:10px;color:#1e293b;line-height:1.6;">You received this because you are a registered user of Dobium Prediction Markets.</p>'
);

c = c.replace(
  '<a href="${ctaUrl}" style="display:inline-block;',
  '<a href="${ctaUrl}" style="display:inline-block;font-family:\'Inter\',Arial,Helvetica,sans-serif;'
);

c = c.replace(
  '<p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">${(n.content || \'\').replace(/\\n/g, \'<br/>\')}</p>',
  '<p style="margin:0;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:14px;color:#94a3b8;line-height:1.6;">${(n.content || \'\').replace(/\\n/g, \'<br/>\')}</p>'
);

c = c.replace(
  '<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d4af37;margin-bottom:2px;">${q.label}</div>',
  '<div style="font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d4af37;margin-bottom:2px;">${q.label}</div>'
);

c = c.replace(
  '<div style="font-size:13px;color:#cbd5e1;line-height:1.5;">${q.question}</div>',
  '<div style="font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:13px;color:#cbd5e1;line-height:1.5;">${q.question}</div>'
);

c = c.replace(
  '<p style="margin:0;font-size:13px;color:#a78040;line-height:1.6;">${callout}</p>',
  '<p style="margin:0;font-family:\'Inter\',Arial,Helvetica,sans-serif;font-size:13px;color:#a78040;line-height:1.6;">${callout}</p>'
);

fs.writeFileSync('backend/server.js', c);
