// Getting the play log off the phone: share sheet where the browser has one, download otherwise.
import { toast } from '../dom';
import { analyze } from './analyze';
import type { PlayLogger } from './log';

function fileName(seed: number, day: number): string {
  const date = new Date().toISOString().slice(0, 10);
  return `squeeze-city-playlog-${date}-seed${seed}-day${day}.json`;
}

export async function exportPlayLog(logger: PlayLogger, day: number): Promise<void> {
  const text = logger.exportText();
  if (!text || !logger.log) {
    toast('Nothing logged yet', 'error');
    return;
  }
  logger.count('export');
  const name = fileName(logger.log.seed, day);
  const file = new File([text], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Squeeze City play log' });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast('Play log saved to your downloads', 'good');
}

export async function copyPlayLogSummary(logger: PlayLogger): Promise<void> {
  if (!logger.exportText() || !logger.log) {
    toast('Nothing logged yet', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(analyze(logger.log));
    logger.count('copySummary');
    toast('Summary copied', 'good');
  } catch {
    toast('Could not copy here. Use Export instead.', 'error');
  }
}
