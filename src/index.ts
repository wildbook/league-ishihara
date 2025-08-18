import path from "node:path";
import crypto from "node:crypto";
import { promises as fsa } from "node:fs";

import { JSONParse, JSONStringify } from "json-with-bigint";

import edits from "./edits.js";
import cfg from "./config.js";

import { exec as runEdit } from "./utils/bin.js";

import logger from "node-color-log";
logger.setLevel("debug");
logger.setDate(() => new Date().toLocaleTimeString());

import "zx/globals";
$.verbose = true;
usePowerShell();

function hashBuffer(data: Buffer) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

logger.info("Extracting files.");

// Cleaning up existing install/overlay directories.
if (await fsa.stat(cfg.paths.install).catch(() => false)) await fsa.rm(cfg.paths.install, { recursive: true });
if (await fsa.stat(cfg.paths.overlay).catch(() => false)) await fsa.rm(cfg.paths.overlay, { recursive: true });

let cache = { used: false, hash: "" };

let ckRef = path.join(cfg.paths.gameDir, cfg.paths.cacheRef);
let ckKey = path.join(cfg.paths.cache.ckey);

let cacheKey = await fsa.readFile(ckRef);
if (cacheKey) {
  let nCkKey = hashBuffer(cacheKey);
  let oCkKey = (await fsa.readFile(ckKey).catch(() => null))?.toString();

  logger.debug(`CKey[old]: ${oCkKey ?? "<none>"}`);
  logger.debug(`CKey[new]: ${nCkKey}`);

  cache.used = oCkKey === nCkKey;
  cache.hash = nCkKey;

  if (!cache.used) {
    logger.info("Cache key changed, will not reuse caches.");

    for (const dir of Object.values(cfg.paths.cache)) {
      if (await fsa.stat(dir).catch(() => false)) {
        logger.info(`Removing existing directory: ${dir}`);
        await fsa.rm(dir, { recursive: true });
      }
    }
  }
} else {
  logger.error("Cache reference file not found, will not reuse caches.");
}

// Building cache directories.
for (const dir of Object.values(cfg.paths.temp)) {
  // Only create the folder if it doesn't already exist.
  if (!(await fsa.stat(dir).catch(() => false))) {
    await fsa.mkdir(dir, { recursive: true });
  }
}

// Building the temp directory.
for (const dir of Object.values(cfg.paths.temp)) {
  if (await fsa.stat(dir).catch(() => false)) {
    logger.info(`Removing existing directory: ${dir}`);
    await fsa.rm(dir, { recursive: true });
  }

  await fsa.mkdir(dir, { recursive: true });
}

let wadsPath = path.join(cfg.paths.gameDir, "DATA", "FINAL");

logger.debug(".wad -> .bin -> .json");

let taskQueue: Promise<void>[] = [];
for (const file of Object.keys(edits)) {
  let iPath = path.join(wadsPath, file);
  let oPath = path.join(cfg.paths.cache.game, file);

  let noCache = !cache.used;
  let noExist = !(await fsa.stat(oPath).catch(() => false));

  if (noCache || noExist) {
    let task = async () => {
      let oText = path.join(cfg.paths.cache.text, file);

      await fsa.mkdir(oPath, { recursive: true });
      await $`${cfg.paths.wadTool} extract --input ${iPath} --output ${oPath} --filter-type bin`;
      await $`${cfg.paths.ritoBin} -i bin -o json -r ${oPath} ${oText}`;
    };

    taskQueue.push(task());
  }
}

await Promise.all(taskQueue);
taskQueue.length = 0;

logger.info("Writing cache key.");
await fsa.mkdir(path.dirname(ckKey), { recursive: true });
await fsa.writeFile(ckKey, cache.hash);

let tempText = cfg.paths.cache.text;
let tempMods = cfg.paths.temp.mods;

await fsa.mkdir(tempMods, { recursive: true });

for (const [wadPath, bins] of Object.entries(edits)) {
  logger.info(`Processing edits for: ${wadPath}`);

  for (const [bin, edit] of Object.entries(bins)) {
    let ent = path.join(tempText, wadPath, bin);
    logger.info(`Editing file: ${ent}`);

    let data = await fsa.readFile(ent);
    let json = JSONParse(data.toString());

    // This write is just there to force a roundtrip and simplify diffing.
    taskQueue.push(fsa.writeFile(ent, JSONStringify(json, null, 2)));

    runEdit(json.entries, edit);

    let wadName = path.basename(wadPath);

    let root = path.join(tempMods, wadName);
    let full = path.join(tempMods, wadName, bin);
    logger.info(`Writing edited file: ${full}`);

    await fsa.mkdir(root, { recursive: true });
    taskQueue.push(fsa.writeFile(full, JSONStringify(json, null, 2)));
  }
}

await Promise.all(taskQueue);
taskQueue.length = 0;

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
