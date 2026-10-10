import './ui/styles.css';
import { App } from './ui/app';
import { audio } from './ui/audio';

const root = document.getElementById('app')!;

function storage(): Storage {
  try {
    const k = '__sc_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    // Private mode or blocked storage: keep the game playable in memory.
    const m = new Map<string, string>();
    return {
      getItem: (key: string) => m.get(key) ?? null,
      setItem: (key: string, v: string) => void m.set(key, v),
      removeItem: (key: string) => void m.delete(key),
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    } as Storage;
  }
}

const app = new App(root, storage());
app.render();
// Exposed for debugging in the browser console only.
(window as unknown as { squeeze: App }).squeeze = app;
(window as unknown as { squeezeAudio: typeof audio }).squeezeAudio = audio;
