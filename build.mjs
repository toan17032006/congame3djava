// esbuild bundler: web/src -> web/dist (bundle.js + bundle.css + index.html)
import * as esbuild from 'esbuild';
import { readFileSync, mkdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'web', 'dist');
mkdirSync(dist, { recursive: true });

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [join(root, 'web', 'src', 'main.js')],
  bundle: true,
  outfile: join(dist, 'bundle.js'),
  minify: !watch,
  sourcemap: watch,
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
  target: ['es2020'],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[build] watching for changes...');
} else {
  await esbuild.build(options);
  copyFileSync(join(root, 'web', 'index.html'), join(dist, 'index.html'));
  console.log('[build] done -> web/dist');
}
