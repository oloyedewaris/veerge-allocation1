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

const allocationNameRanges = [
  ["A", 50],
  ["B", 120],
  ["C", 180],
  ["D", 238],
];

function allocationNameForIndex(index) {
  let offset = index;

  for (const [prefix, count] of allocationNameRanges) {
    if (offset < count) return `UNIT - ${prefix}${offset + 1}`;
    offset -= count;
  }

  throw new Error(`No backend allocation name configured for unit index ${index}`);
}

const csv = await readFile(source, "utf8");
const units = csv
  .split(/\r?\n/)
  .slice(1)
  .filter((line) => line.trim())
  .map((line, index) => {
    const values = line.split(",");
    const unit = Object.fromEntries(
      fields.map((field, fieldIndex) => [field, values[fieldIndex] ?? ""]),
    );
    return {
      ...unit,
      name: allocationNameForIndex(index),
      allocated: unit.availability.trim() !== "Availabel.",
    };
  });

const expectedCount = allocationNameRanges.reduce((total, [, count]) => total + count, 0);
if (units.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} local units, received ${units.length}`);
}

await writeFile(destination, `${JSON.stringify(units, null, 2)}\n`, "utf8");
console.log(`Converted ${units.length} units to ${destination.pathname}`);
