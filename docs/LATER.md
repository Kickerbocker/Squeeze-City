# Later / parking lot

Ideas that came up during development but are not in the GDD. Not to be built without a GDD change.

- **"Restock" helper button:** buys enough stock for yesterday's sales at today's prices, which saves a lot of taps once you have several stands.
- **First-day tutorial hints:** the Shop shows "Stock makes 0 cups", but a new player might not know a pitcher needs lemons *and* sugar.
- **Weather-to-WTP strength:** making temperature matter more in the WTP formula (`wtpThirstBase`/`wtpThirstScale`) is a cleaner way to widen the 60°F/90°F price gap than the WTP-base scaling done in M3. It's a formula coefficient, so it needs sign-off.
- **Stand placement preview on the Map:** show expected customers for tomorrow at each location.
- **Moving staff between stands** without firing and rehiring them.
- **Haptics** (`navigator.vibrate`) on sales and milestones.
- **Storage redesign (Cooler, Fridge):** off sale from M9 because waste is not a real risk at current ingredient prices. See `docs/learning/UNKNOWNS.md` U10.
- **Umbrella redesign:** off sale from M9. It only acts on hot or wet days when there is a line. One idea: shade that draws people in on hot days, so it pairs with the forecast.
- **Mixer redesign:** not offered from M9. Pitcher prep is a small share of serving time, so cutting it earns nothing. Fold into the staff work in M14.
- **Exact twin-day figures for Radio and TV:** they add foot traffic, which changes who arrives. Drawing arrivals at a fixed ceiling rate and thinning them would keep the crowd identical. Natural to do with M15's stepped sim.
- **Profit chart with purchase markers** on the report or stats screen.
- **Stand licence prices:** $2,000, $8,000 and $25,000 are long saves. Revisit after Playtest 2.
- **M16 art and sound, beyond the 2026-10-10 pass:** redesigned characters with more animation frames, distinct stand art per tier, time-of-day lighting on buildings (windows lighting up at dusk), a day/night title screen, music stems that crossfade per hour, and a short jingle when a location unlocks.
