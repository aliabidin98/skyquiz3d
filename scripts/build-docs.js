import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');

console.log('🚀 Memulai proses build folder /docs untuk GitHub Pages...');

try {
  // 1. Run Vite build with outDir: docs and base: ./
  execSync('npx vite build --outDir docs --base ./', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' },
  });

  // 2. Create .nojekyll in docs to prevent GitHub Pages Jekyll processing
  const nojekyllPath = path.join(docsDir, '.nojekyll');
  fs.writeFileSync(nojekyllPath, '', 'utf-8');
  console.log('✅ File docs/.nojekyll berhasil dibuat.');

  // 3. Create 404.html fallback for Single Page Application routing on GitHub Pages
  const indexPath = path.join(docsDir, 'index.html');
  const fallback404Path = path.join(docsDir, '404.html');
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, fallback404Path);
    console.log('✅ File docs/404.html berhasil disalin dari index.html untuk dukungan SPA.');
  }

  console.log('\n🎉 Folder /docs siap dideploy ke GitHub Pages!');
  console.log('📌 Langkah Deploy:');
  console.log('1. Commit dan Push folder /docs ke repository GitHub Anda.');
  console.log('2. Buka repository di GitHub > Settings > Pages.');
  console.log('3. Pada "Build and deployment", pilih Source: "Deploy from a branch".');
  console.log('4. Pilih Branch: "main" (atau "master") dan Folder: "/docs", lalu klik Save.\n');
} catch (error) {
  console.error('❌ Gagal melakukan build folder /docs:', error);
  process.exit(1);
}
