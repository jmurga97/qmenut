// Uso: node /ruta/a/filter-contact-properties.mjs <archivo.json>
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const properties = ["email", "telefono"];

function filterContact(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("El JSON debe contener un objeto o una lista de objetos.");
  }

  return Object.fromEntries(
    properties.filter((property) => property in value).map((property) => [property, value[property]]),
  );
}

export async function filterContactProperties(inputFile) {
  const inputPath = resolve(inputFile);
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  const filtered = Array.isArray(input) ? input.map(filterContact) : filterContact(input);
  const outputPath = resolve(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.limpio.json`);
  const output = JSON.stringify(filtered, null, 2);

  await writeFile(outputPath, `${output}\n`, { flag: "wx" });
  return outputPath;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.error("Uso: node /ruta/a/filter-contact-properties.mjs <archivo.json>");
    process.exitCode = 1;
  } else {
    try {
      console.log(`Archivo generado: ${await filterContactProperties(inputFile)}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
