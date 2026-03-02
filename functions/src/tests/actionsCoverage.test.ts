import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { ACTION_SPECS } from '../tools/actions-spec.ts';

const forbidden = [new RegExp('TO'+'DO','i'), new RegExp('place'+'holder','i'), new RegExp('not impl'+'emented','i')];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
};

(() => {
  const registryText = fs.readFileSync(path.join(root, 'gateways', 'actionRegistry.ts'), 'utf8');
  const contractTexts = [
    fs.readFileSync(path.join(root, 'gateways', 'contracts', 'publicContracts.ts'), 'utf8'),
    fs.readFileSync(path.join(root, 'gateways', 'contracts', 'clientContracts.ts'), 'utf8'),
    fs.readFileSync(path.join(root, 'gateways', 'contracts', 'adminContracts.ts'), 'utf8'),
  ].join('\n');

  const missingInRegistry = ACTION_SPECS.map((a) => a.name).filter((name) => !registryText.includes(`'${name}'`));
  assert.deepStrictEqual(missingInRegistry, []);

  const missingContracts = ACTION_SPECS.map((a) => a.name).filter((name) => !contractTexts.includes(`${name}: { validate:`));
  assert.deepStrictEqual(missingContracts, []);

  const missingHandlers = ACTION_SPECS.map((a) => a.name).filter((name) => !registryText.includes(`handler:`) || !registryText.includes(`'${name}'`));
  assert.deepStrictEqual(missingHandlers, []);

  const files = walk(root);
  const found: Array<{ file: string; token: string }> = [];
  for (const file of files) {
    const c = fs.readFileSync(file, 'utf8');
    for (const rx of forbidden) {
      if (rx.test(c)) found.push({ file, token: rx.source });
    }
  }
  assert.deepStrictEqual(found, []);
})();

console.log('actionsCoverage passed');
