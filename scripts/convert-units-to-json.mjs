import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../public/reference-assets/xzLocalDoc.csv", import.meta.url);
const destination = new URL("../public/reference-assets/units.json", import.meta.url);
const fields = [
  "block",
  "id",
  "model",
  "landArea",
  "buildArea",
  "bedrooms",
  "bathrooms",
  "master",
  "living",
  "kitchen",
  "guest",
  "direction",
  "availability",
];

const csv = await readFile(source, "utf8");
const units = csv
  .split(/\r?\n/)
  .slice(1)
  .filter((line) => line.trim())
  .map((line) => {
    const values = line.split(",");
    return Object.fromEntries(fields.map((field, index) => [field, values[index] ?? ""]));
  });

await writeFile(destination, `${JSON.stringify(units, null, 2)}\n`, "utf8");
console.log(`Converted ${units.length} units to ${destination.pathname}`);
