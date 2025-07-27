import logger from "node-color-log";

import { v, Value } from "./bin_values.js";

const token = {
  stop: {},
};

type TFormSelect = number | string | RegExp;
type TFormChain = TForm[];
type TFormFn = (obj: any) =>
  | undefined
  // A transformed object.
  | any
  // A stop token, abort the current chain.
  | typeof token.stop;

export type TForm = TFormSelect | TFormChain | TFormFn;

const stop = () => token.stop;

const selectMatches = (key: TFormSelect, obj: any): boolean => {
  if (typeof key === "string") {
    return obj.key === key;
  }

  if (key instanceof RegExp) {
    return key.test(obj.key);
  }

  throw new Error(`Invalid key type: ${typeof key}`);
};

const toTransform = (transform: TForm): TFormFn => {
  if (typeof transform === "function") {
    return transform;
  }

  if (typeof transform === "string") {
    return select(transform);
  }

  if (typeof transform === "number") {
    return select(transform);
  }

  if (transform instanceof RegExp) {
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
  (key: TFormSelect): TFormFn =>
  (obj) =>
    Object.values(items(obj)).find((e: any) => selectMatches(key, e));

const filter =
  (key: TFormSelect): TFormFn =>
  (obj) => ({
    items: Object.values(items(obj)).filter((e: any) => selectMatches(key, e)),
  });

const try_ =
  (transform: TForm, or?: TForm): TFormFn =>
  (obj) => {
    try {
      let res = toTransform(transform)(obj);
      if (res) return res;
    } catch (e) {}

    return toTransform(or || stop)(obj);
  };

const iterate =
  (transforms: TForm): TFormFn =>
  (obj) => {
    Object.values(items(obj)).forEach(chain(transforms));
    return obj;
  };

const nth =
  (n: number): TFormFn =>
  (obj) =>
    items(obj)[n];

const if_ =
  (key: TFormSelect, th: TForm, el?: TForm): TFormFn =>
  (obj) => {
    let i = select(key)(obj);
    if (i !== undefined) {
      obj = toTransform(th)(obj);
    } else if (el !== undefined) {
      obj = toTransform(el)(obj);
    }
    return obj;
  };

// TODO: Use values instead? Needs a deserialize function for Value.
const modify =
  (key: TFormSelect, val): TFormFn =>
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
  (key: TFormSelect): TFormFn =>
  (obj) => {
    let i = items(obj);

    let found = Object.entries(i).find(([_, v]: [any, any]) => selectMatches(key, v));
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
      value: v.val2bin(structuredClone(val)),
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
  filter,
  select,

  nth,
  iterate,

  modify,
  remove,
  append,

  if_,
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
