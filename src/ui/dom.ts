// Tiny DOM helpers: h('div', { class: 'x', onclick }, child, 'text').
type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; style?: string };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'disabled' || k === 'checked') (el as unknown as Record<string, unknown>)[k] = Boolean(v);
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' || typeof c === 'number' ? String(c) : c);
  }
  return el;
}

export function mount(parent: HTMLElement, ...children: Child[]): void {
  parent.replaceChildren(...(children.filter((c) => c !== null && c !== undefined && c !== false) as (Node | string)[]).map((c) => (typeof c === 'number' ? String(c) : c)));
}

let toastTimer: number | undefined;
export function toast(message: string, kind: 'info' | 'error' | 'good' = 'info'): void {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = message;
  el.className = `toast show ${kind}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 2600);
}

/** Queue of toasts shown one after another (milestones). */
export async function toastSequence(messages: string[], kind: 'info' | 'good' = 'good'): Promise<void> {
  for (const m of messages) {
    toast(m, kind);
    await new Promise((r) => setTimeout(r, 2700));
  }
}

/** In-page confirmation sheet (browser confirm() is blocked in some embedded views). */
export function confirmSheet(message: string, confirmLabel: string, onConfirm: () => void, danger = false): void {
  const close = () => sheet.remove();
  const sheet = h(
    'div',
    { class: 'sheet-backdrop', onclick: (e: Event) => e.target === sheet && close() },
    h(
      'div',
      { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
      ...message.split('\n').filter(Boolean).map((line) => h('p', null, line)),
      h(
        'button',
        {
          class: `btn block ${danger ? 'danger' : 'primary'}`,
          onclick: () => {
            close();
            onConfirm();
          },
        },
        confirmLabel,
      ),
      h('button', { class: 'btn block ghost', onclick: close }, 'Cancel'),
    ),
  );
  document.body.append(sheet);
  sheet.querySelector<HTMLButtonElement>('.btn')?.focus();
}
