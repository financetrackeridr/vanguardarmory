// build/fetchManifest.mjs
//
// Pulls the Destiny 2 manifest from Bungie, extracts weapon definitions,
// and writes a small flat JSON file the static site can fetch directly.
//
// Run locally:   BUNGIE_API_KEY=xxxx node build/fetchManifest.mjs
// Run in CI:      the API key comes from a GitHub Actions secret (see workflow file)
//
// This script never touches any per-user/OAuth endpoints. Everything here
// is public reference data (item/weapon definitions), so a plain API key
// is all that's required.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const API_KEY = process.env.BUNGIE_API_KEY;
if (!API_KEY) {
  console.error("Missing BUNGIE_API_KEY environment variable.");
  process.exit(1);
}

const BASE = "https://www.bungie.net";
const LOCALE = "en"; // change if you want a different language's item names

async function bungieGet(urlPath) {
  const res = await fetch(BASE + urlPath, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${urlPath}`);
  }
  const json = await res.json();
  if (json.ErrorCode !== 1) {
    throw new Error(`Bungie API error: ${json.Message} (${urlPath})`);
  }
  return json.Response;
}

// DestinyItemType enum value for weapons
const ITEM_TYPE_WEAPON = 3;

// DamageType enum -> we still fetch the definition table for names/icons,
// but this fallback covers items missing a resolvable hash.
const DAMAGE_TYPE_FALLBACK = {
  0: "None",
  1: "Kinetic",
  2: "Arc",
  3: "Solar",
  4: "Void",
  6: "Stasis",
  7: "Strand",
};

async function main() {
  console.log("Fetching manifest index...");
  const manifest = await bungieGet("/Platform/Destiny2/Manifest/");

  const paths = manifest.jsonWorldComponentContentPaths[LOCALE];
  if (!paths) {
    throw new Error(`No manifest content paths for locale "${LOCALE}"`);
  }

  console.log("Downloading component tables (this can take a bit)...");
  const [items, damageTypes, equipSlots] = await Promise.all([
    bungieGet(paths.DestinyInventoryItemDefinition),
    bungieGet(paths.DestinyDamageTypeDefinition),
    bungieGet(paths.DestinyEquipmentSlotDefinition),
  ]);

  console.log(`Loaded ${Object.keys(items).length} item definitions.`);

  const weapons = [];

  for (const hash of Object.keys(items)) {
    const item = items[hash];

    if (item.redacted) continue;
    if (item.itemType !== ITEM_TYPE_WEAPON) continue;
    if (!item.displayProperties?.name) continue;
    // Skip placeholder/classified entries with no icon
    if (!item.displayProperties?.icon) continue;

    const damageHash = item.defaultDamageTypeHash;
    const damageDef = damageHash ? damageTypes[damageHash] : null;
    const damageType =
      damageDef?.displayProperties?.name ||
      DAMAGE_TYPE_FALLBACK[item.defaultDamageType] ||
      "Unknown";

    const slotHash = item.equippingBlock?.equipmentSlotTypeHash;
    const slotDef = slotHash ? equipSlots[slotHash] : null;
    const slot = slotDef?.displayProperties?.name || "Unknown";

    weapons.push({
      hash: Number(hash),
      name: item.displayProperties.name,
      icon: BASE + item.displayProperties.icon,
      screenshot: item.screenshot ? BASE + item.screenshot : null,
      flavorText: item.flavorText || "",
      weaponType: item.itemTypeDisplayName || "Weapon", // e.g. "Hand Cannon"
      tier: item.inventory?.tierTypeName || "Unknown", // e.g. "Exotic", "Legendary"
      damageType, // e.g. "Solar", "Void"
      slot, // e.g. "Kinetic Weapons", "Power Weapons"
    });
  }

  // Sort alphabetically for readability/diffing in git
  weapons.sort((a, b) => a.name.localeCompare(b.name));

  const outDir = path.resolve("docs/data");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "weapons.json"),
    JSON.stringify(weapons, null, 2)
  );

  console.log(`Wrote ${weapons.length} weapons to docs/data/weapons.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
