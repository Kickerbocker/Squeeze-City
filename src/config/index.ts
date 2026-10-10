import calendar from './calendar.json';
import customers from './customers.json';
import events from './events.json';
import feedback from './feedback.json';
import ingredients from './ingredients.json';
import locations from './locations.json';
import marketing from './marketing.json';
import progression from './progression.json';
import recipe from './recipe.json';
import reputation from './reputation.json';
import service from './service.json';
import staff from './staff.json';
import stands from './stands.json';
import upgrades from './upgrades.json';
import weather from './weather.json';
import { type GameConfig, validateConfig } from './schema';

export * from './schema';
export { ConfigError } from './guards';

/** The raw JSON bundle, before validation. */
export function rawConfig(): Record<keyof GameConfig, unknown> {
  return {
    calendar,
    weather,
    ingredients,
    recipe,
    customers,
    service,
    reputation,
    locations,
    stands,
    upgrades,
    staff,
    marketing,
    events,
    progression,
    feedback,
  };
}

/** Validate an untrusted config bundle. Throws ConfigError with the offending path. */
export function loadConfig(raw: unknown = rawConfig()): GameConfig {
  return validateConfig(structuredClone(raw), 'config');
}

/** The validated default config. */
export const CONFIG: GameConfig = loadConfig();
