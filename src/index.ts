import path from "node:path";
import { promises as fsa } from "node:fs";

import edits from "./edits.js";
import cfg from "./config.js";

import logger from "node-color-log";
logger.setLevel("debug");
logger.setDate(() => new Date().toLocaleTimeString());

import "zx/globals";
$.verbose = true;
usePowerShell();

logger.info("Extracting files.");

// Cleaning up existing install/overlay directories.
if (await fsa.stat(cfg.paths.install).catch(() => false)) await fsa.rmdir(cfg.paths.install, { recursive: true });
if (await fsa.stat(cfg.paths.overlay).catch(() => false)) await fsa.rmdir(cfg.paths.overlay, { recursive: true });

// Building the temp directory.
for (const dir of Object.values(cfg.paths.temp)) {
  if (await fsa.stat(dir).catch(() => false)) {
    logger.info(`Removing existing directory: ${dir}`);
    await fsa.rmdir(dir, { recursive: true });
  }

  await fsa.mkdir(dir, { recursive: true });
}

let wadsPath = path.join(cfg.paths.gameDir, "DATA", "FINAL");

for (const file of Object.keys(edits)) {
  let inputPath = path.join(wadsPath, file);
  let storePath = path.join(cfg.paths.temp.game, file);

  logger.info(`Processing file: ${file}`);
  await fsa.mkdir(storePath, { recursive: true });

  await $`${cfg.paths.wadTool} extract --input ${inputPath} --output ${storePath} --filter-type bin`;
}

await $`${cfg.paths.ritoBin} -i bin -o json -r ${cfg.paths.temp.game} ${cfg.paths.temp.text}`;

let tempText = cfg.paths.temp.text;
let tempMods = cfg.paths.temp.mods;

await fsa.mkdir(tempMods, { recursive: true });

for (const [wadPath, bins] of Object.entries(edits)) {
  logger.info(`Processing edits for: ${wadPath}`);

  for (const [bin, edits] of Object.entries(bins)) {
    let ent = path.join(tempText, wadPath, bin);
    logger.info(`Editing file: ${ent}`);

    let data = await fsa.readFile(ent);
    let json = JSON.parse(data.toString());
    await fsa.writeFile(ent, JSON.stringify(json, null, 2));

    for (const edit of edits) {
      edit(json.entries);
    }

    let wadName = path.basename(wadPath);

    let root = path.join(tempMods, wadName);
    let full = path.join(tempMods, wadName, bin);
    logger.info(`Writing edited file: ${full}`);

    await fsa.mkdir(root, { recursive: true });
    await fsa.writeFile(full, JSON.stringify(json, null, 2));
  }
}

logger.info("Executing ritobin.");
await $`${cfg.paths.ritoBin} -i json -o bin -r ${cfg.paths.temp.mods} ${cfg.paths.temp.done}`;

const modDir = path.join(cfg.paths.install, "mod");
const wadDir = path.join(modDir, "WAD");

await fsa.mkdir(modDir, { recursive: true });
await fsa.mkdir(wadDir, { recursive: true });

await fsa.mkdir(path.join(modDir, "META"), { recursive: true });
await fsa.writeFile(path.join(modDir, "META", "info.json"), "");

await fsa.cp(cfg.paths.temp.done, wadDir, { recursive: true });

logger.info("Preparing overlay.");
await $`${cfg.paths.modTool} mkoverlay ${cfg.paths.install} ${cfg.paths.overlay} --noTFT --game:${cfg.paths.gameDir} --mods:mod`;

logger.info("Initializing overlay.");
await $`${cfg.paths.modTool} runoverlay ${cfg.paths.overlay} . --game:${cfg.paths.gameDir}`;
