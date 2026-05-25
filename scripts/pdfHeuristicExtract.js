const fs = require('fs');
const path = require('path');

function extractAsciiSequences(buffer, minLen = 4) {
  const text = buffer.toString('latin1');
  const re = new RegExp('[\x20-\x7E]{' + minLen + ',}', 'g');
  const matches = text.match(re) || [];
  return matches.join('\n');
}

function run() {
  const base = path.resolve(__dirname, '..');
  const files = [
    { in: path.join(base, 'TT 2026-B116.pdf'), out: path.join(base, 'debug', 'TT_2026-B116_heuristic.txt') },
    { in: path.join(base, 'Presentación TT 2026-B116.pdf'), out: path.join(base, 'debug', 'Presentacion_TT_2026-B116_heuristic.txt') }
  ];

  for (const f of files) {
    if (!fs.existsSync(f.in)) {
      console.error('File not found:', f.in);
      continue;
    }
    const buffer = fs.readFileSync(f.in);
    const extracted = extractAsciiSequences(buffer, 6);
    fs.writeFileSync(f.out, extracted, 'utf8');
    console.log('Wrote', f.out);
  }
}

run();
