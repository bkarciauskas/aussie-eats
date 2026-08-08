import { writeFileSync } from "node:fs";
import { restaurants } from "../prisma/seed-data.ts";

const dest = new URL("../backend/app/seed_data.json", import.meta.url);
writeFileSync(dest, JSON.stringify({ restaurants }, null, 2) + "\n");
console.log(`Wrote ${dest.pathname} (${restaurants.length} restaurants)`);
