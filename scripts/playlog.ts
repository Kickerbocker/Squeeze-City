// Reads a play log exported from the Stats screen and prints a report for design analysis.
// Usage: npm run playlog -- path/to/squeeze-city-playlog-....json [--json]
import { readFileSync } from 'node:fs';
import { analyze, analyzeP1 } from '../src/ui/playlog/analyze';
import { parseLog } from '../src/ui/playlog/log';

const path = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!path) {
  console.error('Usage: npm run playlog -- <exported play log .json>');
  process.exit(1);
}
const text = readFileSync(path, 'utf8');
const raw = JSON.parse(text) as { mode?: string };
if (raw.mode === 'p1') {
  console.log(analyzeP1(raw as Parameters<typeof analyzeP1>[0]));
  process.exit(0);
}
const log = parseLog(text);
if (!log) {
  console.error(`${path} is not a Squeeze City play log.`);
  process.exit(1);
}
console.log(analyze(log));
