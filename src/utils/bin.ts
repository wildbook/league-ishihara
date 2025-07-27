import { IntRange } from "./ts.js";
import logger from "node-color-log";

type TFormSelect = string;
type TFormFn = (obj: any) => any;

export type TForm = TFormSelect | TFormFn;

const token = {
  stop: {},
};

const stop = () => token.stop;

const toTransform = (transform: TForm): TFormFn => {
  if (typeof transform === "function") {
    return transform;
  }

  if (typeof transform === "string") {
    return select(transform);
  }

  throw new Error(`Invalid transform: ${transform}`);
};

const items: TFormFn = (obj: any) => obj.items ?? obj.value.items ?? obj;
const chain =
  (...transforms: TForm[]): TFormFn =>
  (obj: any) => {
    for (const transform of transforms) {
      obj = toTransform(transform)(obj);

      if (obj == token.stop) {
        logger.warn("transform returned `stop` token, aborting.");
        return obj;
      }
    }

    return obj;
  };

const select =
  (key: string): TFormFn =>
  (obj) =>
    Object.values(items(obj)).find((e: any) => e.key === key);

const try_ =
  (transform: TForm, or?: TForm): TFormFn =>
  (obj) => {
    let res = toTransform(transform)(obj);
    return res || toTransform(or || stop)(obj);
  };

const iterate =
  (...transforms: TForm[]): TFormFn =>
  (obj) => {
    Object.values(items(obj)).forEach(chain(...transforms));
    return obj;
  };

const modify =
  (key: string, val): TFormFn =>
  (obj) => {
    let v;

    if (typeof val !== "function") {
      v = () => val;
    } else {
      v = val;
    }

    (<any>select(key)(obj)).value = v(obj.value);
    return obj;
  };

const remove =
  (key: string): TFormFn =>
  (obj) => {
    let i = items(obj);

    let found = Object.entries(i).find(([_, v]: [any, any]) => v.key === key);
    if (!found) {
      logger.warn(`Key "${key}" not found in object`, obj);
      throw new Error(`Key "${key}" not found.`);
    }

    let [k, _] = found;
    i.splice(k, 1);

    return obj;
  };

const append =
  (field): TFormFn =>
  (obj) => {
    items(obj).push(structuredClone(field));
    return obj;
  };

const object = (key: string, type: string, value: any) => ({
  key: key,
  type: type,
  value: value,
});

const field = object;
const struct = (key: string, type: string, ty: string, fields: any[]) =>
  object(key, type, {
    items: fields ?? [],
    name: ty,
  });

const debug: TFormFn = (obj: any) => {
  console.dir(obj, { depth: 5 });
  return obj;
};

const print =
  (txt: string): TFormFn =>
  (obj) => {
    logger.debug(txt);
    return obj;
  };

const rgba = (
  r: IntRange<0, 256>,
  g: IntRange<0, 256>,
  b: IntRange<0, 256>,
  a: number, // 0.0 to 1.0
) => [r / 255, g / 255, b / 255, a];

const rgb = (r: IntRange<0, 256>, g: IntRange<0, 256>, b: IntRange<0, 256>) => rgba(r, g, b, 1);

// Exports for bin pipeline.
export const b = {
  items,
  chain,
  select,
  iterate,
  modify,
  remove,
  append,

  try_,
  stop,
};

// Exports for debugging.
export const dbg = {
  debug,
  print,
};

// Exports for variable creation.
export const v = {
  rgba,
  rgb,

  object,
  field,
  struct,
};
