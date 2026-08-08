import { writeFileSync } from "node:fs";
import { menuForCuisine } from "../prisma/cuisine-menu-templates.ts";

const KEYS = [
  "Burgers",
  "Thai",
  "Pizza",
  "Italian",
  "Cafe",
  "Sushi",
  "Japanese",
  "Indian",
  "Mexican",
  "Bakery",
  "Seafood",
  "Default",
] as const;

const templates = Object.fromEntries(
  KEYS.map((key) => [key, menuForCuisine(key)]),
);

const dest = new URL(
  "../backend/app/domain/cuisine_menu_templates.json",
  import.meta.url,
);
writeFileSync(dest, JSON.stringify({ templates }, null, 2) + "\n");
console.log(`Wrote ${dest.pathname} (${KEYS.length} cuisine templates)`);
