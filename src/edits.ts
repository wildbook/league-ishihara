import { xxh64 } from "@node-rs/xxhash";
import { dbg, e, m, TForm } from "./utils/bin.js";

import { t } from "./utils/bin_types.js";
import logger from "node-color-log";

type Edits = {
  [wadPath: string]: { [bin: string]: TForm };
};

function path(str: string): string {
  return xxh64(str, BigInt(0)).toString(16).padStart(16, "0") + ".json";
}

export const darkenMap: Edits = {
  // Summoner's Rift - Map 11
  "Maps/Shipping/Map11.wad.client": {
    // Map Skin - Spirit Blossom
    [path("data/maps/mapgeometry/map11/bloom.materials.bin")]: [
      e.iterate((x) => {
        let val = x.value;
        if (val.name !== "StaticMaterialDef") {
          return;
        }

        let name: string = val.items.find((x) => x.key === "Name")?.value;
        let deny = ![
          "Maps/KitPieces/SRS/Bloom/Materials/Default/Bloom_Ground", // Global ground

          "Maps/KitPieces/SRS/Bloom/Materials/Default/Bloom_Chaos_Spawn_A_MAT", // Chaos spawn
          "Maps/KitPieces/SRS/Bloom/Materials/Default/Bloom_Order_Spawn_A_MAT", // Order spawn

          "Maps/KitPieces/SRS/Bloom/Materials/Default/Bloom_Chaos_Base_A_MAT", // Upper half
          "Maps/KitPieces/SRS/Bloom/Materials/Default/Bloom_Chaos_Base_B_MAT", // Lower half

          "Maps/KitPieces/SRS/Bloom/Materials/Default/Bloom_Order_Base_A_MAT", // Upper half
          "Maps/KitPieces/SRS/Bloom/Materials/Default/Bloom_Order_Base_B_MAT", // Lower half
        ].find((x) => name.startsWith(x));

        if (deny) {
          return;
        }

        let params = val.items.find((x) => x.key === "ParamValues");
        for (const param of params.value.items) {
          let key = param.items.find((x) => x.key === "Name");
          let val = param.items.find((x) => x.key === "Value");

          if (!["TintColor", "BaseTex_TintColor"].includes(key.value)) {
            continue;
          }

          logger.debug(`Modified ${name} (${key.value})`);
          val.value = [0.3, 0.3, 0.3, 0];
        }
      }),
    ],
  },
};

export const xerath: Edits = {
  "Champions/Xerath.wad.client": {
    "a120033c1ad32987.json": [
      "Characters/Xerath/Skins/Skin5/Particles/Xerath_Skin05_Q_aoe_reticle_red",
      "ComplexEmitterDefinitionData",

      e.iterate([
        // We don't want to use the stupid texture.
        e.remove("ParticleColorTexture"),
        e.modify("ColorRenderFlags", m.bit_clear(1)),

        // To prevent it from defaulting to white, add a color.
        e.append("Color", t.ValueColor([0.9, 0.4, 1, 1])),
      ]),
    ],
  },
};

export const edits: Edits = {
  ...darkenMap,
  ...xerath,
};

export default edits;
