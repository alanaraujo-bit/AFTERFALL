#!/usr/bin/env node
/** Gera os ícones PNG do PWA a partir de assets/icon.svg (arte original do AFTERFALL). */
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(resolve(ROOT, 'assets/icon.svg'));
const out = (name) => resolve(ROOT, 'public', name);

// Ícones "any": arte ocupando o quadro inteiro.
for (const size of [64, 192, 512]) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out(`pwa-${size}x${size}.png`));
}
// Apple touch icon (iOS aplica a própria máscara).
await sharp(svg, { density: 300 }).resize(180, 180).png().toFile(out('apple-touch-icon-180x180.png'));

// Maskable: arte reduzida para caber na zona segura (círculo de 80%).
const inner = await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b0c0c' } })
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(out('maskable-icon-512x512.png'));

console.log('Ícones gerados em public/');
