import { v } from "./bin_values.js";

export const ValueFloat = (value: number) =>
  v.embed("ValueFloat", {
    ConstantValue: v.f32(value),
  });

export const ValueVector2 = (vec2: [number, number]) =>
  v.embed("ValueVector2", {
    ConstantValue: v.vec2(vec2),
  });

export const ValueVector3 = (vec3: [number, number, number]) =>
  v.embed("ValueVector3", {
    ConstantValue: v.vec3(vec3),
  });

export const ValueColor = (rgba: [number, number, number, number]) =>
  v.embed("ValueColor", {
    ConstantValue: v.vec4(rgba),
  });

export const t = {
  ValueFloat,
  ValueVector2,
  ValueVector3,
  ValueColor,
};
