import { CAMPAIGNS, CONFIG, type LocationId } from '../../../config';
import { campaignStrength } from '../../../sim/marketing';
import type { App } from '../../app';
import { canAfford, selectedStand } from '../../components';
import { h } from '../../dom';
import { purchaseLines } from '../../purchase';
import { locName, money } from '../../text';

export function marketingTab(app: App): HTMLElement {
  const s = app.game;
  const m = CONFIG.marketing;
  const unlocked = CONFIG.locations.locations.filter((l) => s.locations[l.id].unlocked).map((l) => l.id);
  const active = s.campaigns.filter((c) => campaignStrength(c, s.day, CONFIG) > 0);
  // Flyers are projected for the selected stand's spot (or the first open one).
  const here = selectedStand(app).locationId ?? s.stands.find((st) => st.locationId)?.locationId ?? null;
  const hereStand = s.stands.find((st) => st.locationId === here) ?? null;

  const chooseLocation = (onPick: (id: LocationId) => void) => {
    const close = () => sheet.remove();
    const sheet = h(
      'div',
      { class: 'sheet-backdrop', onclick: (e: Event) => e.target === sheet && close() },
      h(
        'div',
        { class: 'sheet' },
        h('h3', null, 'Hand out flyers where?'),
        ...unlocked.map((id) => h('button', { class: 'btn block', onclick: () => (close(), onPick(id)) }, locName(id))),
        h('button', { class: 'btn block ghost', onclick: close }, 'Cancel'),
      ),
    );
    document.body.append(sheet);
  };

  return h(
    'div',
    { class: 'stack' },
    h(
      'section',
      { class: 'card' },
      h('h3', null, 'Running campaigns'),
      active.length === 0
        ? h('p', { class: 'muted small' }, 'None. Ads make more passers-by stop; their effect fades day by day.')
        : h(
            'ul',
            { class: 'plain' },
            ...active.map((c) => {
              const cfg = m.campaigns[c.id];
              const left = c.startDay + cfg.days - s.day;
              return h(
                'li',
                null,
                h('strong', null, cfg.name),
                c.locationId ? ` · ${locName(c.locationId)}` : ' · all stands',
                h('span', { class: 'muted small' }, ` — ${Math.round(campaignStrength(c, s.day, CONFIG) * 100)}% strength, ${left} day${left === 1 ? '' : 's'} left`),
              );
            }),
          ),
      h('p', { class: 'small muted' }, `Overlapping campaigns stack, up to ×${m.adFactorCap} stopping.`),
    ),
    ...CAMPAIGNS.map((id) => {
      const c = m.campaigns[id];
      const effect = [`+${Math.round(c.adBonus * 100)}% stopping`, c.trafficBonus > 0 ? `+${Math.round(c.trafficBonus * 100)}% foot traffic` : null]
        .filter(Boolean)
        .join(', ');
      return h(
        'section',
        { class: 'card upgrade' },
        h('span', { class: 'person-icon', 'aria-hidden': 'true' }, { flyers: '📄', newspaper: '📰', radio: '📻', tv: '📺' }[id]),
        h(
          'div',
          { class: 'grow' },
          h('strong', null, c.name),
          h('div', { class: 'small' }, effect),
          h('div', { class: 'small muted' }, `${c.days} days, fading · ${c.scope === 'all' ? 'all stands' : 'one location'}`),
          c.scope === 'location' && here ? h('div', { class: 'small muted' }, `At ${locName(here)}:`) : null,
          c.scope === 'location' && !here
            ? null
            : purchaseLines(s, {
                action: c.scope === 'location' ? { type: 'startCampaign', campaign: id, locationId: here! } : { type: 'startCampaign', campaign: id },
                kind: 'campaign',
                item: id,
                onMath: () => app.playlog.mathOpened(id),
                standId: c.scope === 'location' ? (hereStand?.id ?? null) : null,
                upfront: null,
                dailyNote: 'after cost',
              }),
        ),
        h(
          'button',
          {
            class: 'btn primary',
            disabled: !canAfford(s, c.cost),
            onclick: () =>
              c.scope === 'location'
                ? chooseLocation((loc) => app.act({ type: 'startCampaign', campaign: id, locationId: loc }))
                : app.act({ type: 'startCampaign', campaign: id }),
          },
          money(c.cost, false),
        ),
      );
    }),
  );
}
