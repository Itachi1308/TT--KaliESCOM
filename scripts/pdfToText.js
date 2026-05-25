const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extract(pdfPath, outPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((s) => s.str);
    fullText += strings.join(' ') + '\n\n';
  }
  fs.writeFileSync(outPath, fullText, 'utf8');
  console.log(`Wrote ${outPath}`);
}

(async () => {
  try {
    const base = path.resolve(__dirname, '..');
    const files = [
      { in: path.join(base, 'TT 2026-B116.pdf'), out: path.join(base, 'debug', 'TT_2026-B116.txt') },
      { in: path.join(base, 'Presentación TT 2026-B116.pdf'), out: path.join(base, 'debug', 'Presentacion_TT_2026-B116.txt') }
    ];

    for (const f of files) {
      if (!fs.existsSync(f.in)) {
        console.error('File not found:', f.in);
        continue;
      }
      await extract(f.in, f.out);
    }
    console.log('Done');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
