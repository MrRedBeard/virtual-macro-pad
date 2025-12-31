const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputFile = process.argv[2];
if (!inputFile)
{
  console.error('Usage: node scripts/icons.js path/to/logo.png|svg');
  process.exit(1);
}

const ext = path.extname(inputFile).toLowerCase();
if (ext !== '.png' && ext !== '.svg')
{
  console.error('Only .png or .svg supported');
  process.exit(1);
}

const outputDir = path.join(__dirname, '..', 'www', 'content', 'img');
const rootOutput = path.join(__dirname, '..', 'www');
fs.mkdirSync(outputDir, { recursive: true });

(async () =>
{
  try
  {
    const basePng = path.join(outputDir, 'site-logo.png');
    const image = sharp(inputFile);

    const sizes =
      [
        16,
        32,
        64,
        128,
        256,
        512,
      ];

    // Render input (even SVG) to PNG base logo first
    // await image.resize(256, 256).toFile(basePng);
    await image.resize(512, 512).png().toFile(basePng);
    console.log('Saved site-logo.png');

    // Generate icons from PNG base
    // await image.resize(32, 32).toFile(path.join(outputDir, 'favicon-32x32.png'));
    // await image.resize(16, 16).toFile(path.join(outputDir, 'favicon-16x16.png'));
    // await image.resize(180, 180).toFile(path.join(outputDir, 'apple-touch-icon.png'));
    // await image.resize(48, 48).toFile(path.join(rootOutput, 'favicon.ico'));

    const linuxIconDir = path.join(__dirname, '..', 'resources', 'icons');
    fs.mkdirSync(linuxIconDir, { recursive: true });

    const base = sharp(basePng);
    for (const size of sizes)
    {
      await base
        .clone()
        .resize(size, size)
        .png()
        .toFile(path.join(linuxIconDir, `${size}x${size}.png`));
    }

    await image.resize(256, 256).png().toFile(basePng);

    // Build an .ico from PNGs
    // npm i -D png-to-ico
    const pngToIco = require('png-to-ico').default;
    const icoBuf = await pngToIco([
      path.join(outputDir, 'favicon-16x16.png'),
      path.join(outputDir, 'favicon-32x32.png')
    ]);
    fs.writeFileSync(path.join(rootOutput, 'favicon.ico'), icoBuf);

    console.log('Generated favicon.ico and all PNG sizes');
    console.log('All done!');
  }
  catch (err)
  {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();