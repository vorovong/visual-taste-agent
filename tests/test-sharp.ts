import { analyzeImage } from '../lib/capture/image';
import { mkdirSync } from 'fs';
import sharp from 'sharp';

async function main() {
  const testDir = '/tmp/vta-test';
  mkdirSync(testDir, { recursive: true });
  await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 100, b: 50 } } })
    .png()
    .toFile(testDir + '/test.png');

  const result = await analyzeImage(testDir + '/test.png');
  if (result.dominantColors.length === 0) throw new Error('No colors extracted');
  if (result.width !== 100) throw new Error('Width mismatch');
  console.log('Image analysis test: PASS');
  console.log('Dominant color:', result.dominantColors[0].hex, result.dominantColors[0].percentage + '%');
}
main().catch(e => { console.error(e); process.exit(1); });
