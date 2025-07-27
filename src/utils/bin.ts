import logger from "node-color-log";

import { v, Value } from "./bin_values.js";

const token = {
  stop: {},
};

type TFormSelect = string;
type TFormChain = TForm[];
type TFormFn = (obj: any) =>
  | undefined
  // A transformed object.
  | any
  // A stop token, abort the current chain.
  | typeof token.stop;

export type TForm = TFormSelect | TFormChain | TFormFn;

const stop = () => token.stop;

const toTransform = (transform: TForm): TFormFn => {
  if (typeof transform === "function") {
    return transform;
  }

  if (typeof transform === "string") {
    return select(transform);
  }

  if (Array.isArray(transform)) {
    return chain(...transform);
  }

  throw new Error(`Invalid transform: ${transform}`);
};

const items: TFormFn = (obj) => obj.items ?? obj.value.items ?? obj;
const chain =
  (...transforms: TForm[]): TFormFn =>
  (obj) => {
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
    let run;

    if (typeof val !== "function") {
      run = () => val;
    } else {
      run = val;
    }

    (<any>select(key)(obj)).value = run(obj.value);
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
  (key: string, val: Value): TFormFn =>
  (obj) => {
    items(obj).push({
      key: key,
      type: val.type,
      value: v.serialize(structuredClone(val)),
    });

    return obj;
  };

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

// Exports for bin pipeline.
export const e = {
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

// Exports for .modify helpers.
export const m = {
  bit_write: (val: number) => (x: number) => x | val,
  bit_clear: (val: number) => (x: number) => x & ~val,
};

export function exec(entries: any, tform: TForm) {
  return toTransform(tform)(entries);
}
