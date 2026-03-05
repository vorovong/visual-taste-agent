import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const DESIGN_DIR = new URL('../../design-system', import.meta.url).pathname;
const REF_DIR = join(DESIGN_DIR, 'references');

export async function getRefDirs() {
  const entries = await readdir(REF_DIR).catch(() => []);
  return entries.filter(e => e.startsWith('ref-'));
}

export async function getNextRefId() {
  const dirs = await getRefDirs();
  const ids = dirs
    .map(d => parseInt(d.replace('ref-', ''), 10))
    .filter(n => !isNaN(n));
  const next = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  return String(next).padStart(3, '0');
}

export async function getRefCount() {
  const dirs = await getRefDirs();
  return dirs.length;
}

export async function checkDuplicateUrl(url) {
  const dirs = await getRefDirs();
  for (const d of dirs) {
    const mdPath = join(REF_DIR, d, `${d}.md`);
    try {
      const content = await readFile(mdPath, 'utf-8');
      if (content.includes(`url: ${url}`)) return d;
    } catch {}
  }
  return null;
}

export async function saveReference({ id, url, imagePath, verdict, context }) {
  const refDir = join(REF_DIR, id);
  const screenshotsDir = join(refDir, 'screenshots');
  await mkdir(screenshotsDir, { recursive: true });

  const now = new Date().toISOString().split('T')[0];
  const source = url || (imagePath ? 'direct-image' : 'unknown');

  const frontmatter = [
    '---',
    `id: ${id}`,
    `url: ${source}`,
    `captured: ${now}`,
    `verdict: ${verdict}`,
    'context:',
    `  medium: ${context.medium}`,
    `  purpose: ${context.purpose || '미지정'}`,
    `  audience: ${context.audience || '미지정'}`,
    'screenshots: []',
    '---',
    '',
    '## AI 분석',
    '(에이전트 세션에서 분석 예정)',
    '',
  ].join('\n');

  await writeFile(join(refDir, `${id}.md`), frontmatter);
  return refDir;
}

export async function updateRefScreenshots(id, screenshotFiles) {
  const refFile = join(REF_DIR, id, `${id}.md`);
  let content = await readFile(refFile, 'utf-8');
  const list = screenshotFiles.map(f => `  - ${f}`).join('\n');
  content = content.replace('screenshots: []', `screenshots:\n${list}`);
  await writeFile(refFile, content);
}
