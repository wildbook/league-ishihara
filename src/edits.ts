import { b, v } from "./utils/bin.js";

export default {
  "Champions\\Xerath.wad.client": {
    "a120033c1ad32987.json": [
      b.chain(
        "Characters/Xerath/Skins/Skin5/Particles/Xerath_Skin05_Q_aoe_reticle_red",
        "ComplexEmitterDefinitionData",

        b.iterate(
          // We don't want to use the stupid texture.
          b.remove("ParticleColorTexture"),
          b.modify("ColorRenderFlags", (x) => x & ~1),

          // To prevent it from defaulting to white, add a color.
          b.append(
            v.struct("Color", "embed", "ValueColor", [
              v.field("ConstantValue", "vec4", v.rgb(230, 100, 255)),
            ])
          )
        )
      ),
    ],
  },
};
