import { e, m, TForm } from "./utils/bin.js";

import { t } from "./utils/bin_types.js";

type Edits = {
  [wadPath: string]: { [bin: string]: TForm };
};

export const edits: Edits = {
  "Champions/Xerath.wad.client": {
    "a120033c1ad32987.json": [
      "Characters/Xerath/Skins/Skin5/Particles/Xerath_Skin05_Q_aoe_reticle_red",
      "ComplexEmitterDefinitionData",

      e.iterate(
        // We don't want to use the stupid texture.
        e.remove("ParticleColorTexture"),
        e.modify("ColorRenderFlags", m.bit_clear(1)),

        // To prevent it from defaulting to white, add a color.
        e.append("Color", t.ValueColor([0.9, 0.4, 1, 1])),
      ),
    ],
  },
};

export default edits;
