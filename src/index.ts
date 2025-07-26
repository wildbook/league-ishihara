import path from "node:path";
import { promises as fsa } from "node:fs";

import edits from "./edits.js";
import cfg from "./config.js";

import "zx/globals";

$.verbose = true;
usePowerShell();

console.log("Extracting files.");

// Cleaning up existing install/overlay directories.
if (await fsa.stat(cfg.paths.install).catch(() => false))
  await fsa.rmdir(cfg.paths.install, { recursive: true });
if (await fsa.stat(cfg.paths.overlay).catch(() => false))
  await fsa.rmdir(cfg.paths.overlay, { recursive: true });

// Building the temp directory.
for (const dir of Object.values(cfg.paths.temp)) {
  if (await fsa.stat(dir).catch(() => false)) {
    console.log(`Removing existing directory: ${dir}`);
    await fsa.rmdir(dir, { recursive: true });
  }

  await fsa.mkdir(dir, { recursive: true });
}

let wadsPath = path.join(cfg.paths.gameDir, "DATA", "FINAL");

for (const file of Object.keys(edits)) {
  let inputPath = path.join(wadsPath, file);
  let storePath = path.join(cfg.paths.temp.game, file);

  console.log(`Extracting ${file} to ${storePath}`);
  await fsa.mkdir(storePath, { recursive: true });

  await $`${cfg.paths.wad2bin} ${inputPath} ${storePath}`;
}

// delete non-bin files from the temp game directory
for (const ent of await fsa.readdir(cfg.paths.temp.game, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!ent.isFile()) {
    continue;
  }

  if (ent.name.endsWith(".bin")) {
    continue;
  }

  await fsa.rm(`${ent.parentPath}/${ent.name}`, { force: true });
}

await $`${cfg.paths.ritoBin} -i bin -o json -r ${cfg.paths.temp.game} ${cfg.paths.temp.text}`;

let tempText = cfg.paths.temp.text;
let tempMods = cfg.paths.temp.mods;

await fsa.mkdir(tempMods, { recursive: true });

for (const [wadPath, bins] of Object.entries(edits)) {
  console.log("Processing edits for:", wadPath);

  for (const bin of Object.keys(bins)) {
    let ent = path.join(tempText, wadPath, bin);
    console.log(`Editing: ${ent}`);

    let data = await fsa.readFile(ent);
    let json = JSON.parse(data.toString());
    await fsa.writeFile(ent, JSON.stringify(json, null, 2));

    for (const edit of edits[wadPath][bin]) {
      edit(json.entries);
    }

    let wadName = path.basename(wadPath);

    let root = path.join(tempMods, wadName);
    let full = path.join(tempMods, wadName, bin);
    console.log(`Writing: ${full}`);

    await fsa.mkdir(root, { recursive: true });
    await fsa.writeFile(full, JSON.stringify(json, null, 2));
  }
}

console.log("Running ritobin...");
await $`${cfg.paths.ritoBin} -i json -o bin -r ${cfg.paths.temp.mods} ${cfg.paths.temp.done}`;

const modDir = path.join(cfg.paths.install, "mod");
const wadDir = path.join(modDir, "WAD");

await fsa.mkdir(modDir, { recursive: true });
await fsa.mkdir(wadDir, { recursive: true });

await fsa.mkdir(path.join(modDir, "META"), { recursive: true });
await fsa.writeFile(path.join(modDir, "META", "info.json"), "");

await fsa.cp(cfg.paths.temp.done, wadDir, { recursive: true });

console.log("Preparing overlay.");
await $`${cfg.paths.modTool} mkoverlay ${cfg.paths.install} ${cfg.paths.overlay} --noTFT --game:${cfg.paths.gameDir} --mods:mod`;

console.log("Initializing overlay.");
await $`${cfg.paths.modTool} runoverlay ${cfg.paths.overlay} . --game:${cfg.paths.gameDir}`;
