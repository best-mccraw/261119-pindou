const fs = require('node:fs'), path = require('node:path');
function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory())
        walk(p);
    else if (p.endsWith('.js')) {
        const out = p.replace(/^build/, 'miniprogram');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.copyFileSync(p, out);
    }
} }
walk('build');
fs.mkdirSync('cloudfunctions/api/core', { recursive: true });
fs.copyFileSync('build/core/pattern.js', 'cloudfunctions/api/core/pattern.js');
