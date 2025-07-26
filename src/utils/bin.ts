import { IntRange } from "./ts.js";

let toTransform = (transform: any) => {
  if (typeof transform === "function") {
    return transform;
  }

  if (typeof transform === "string") {
    return select(transform);
  }

  throw new Error(`Invalid transform: ${transform}`);
};

let items = (obj: any) => obj.items ?? obj.value.items ?? obj;
let chain =
  (...transforms) =>
  (obj) => {
    transforms.reduce((acc, transform) => toTransform(transform)(acc), obj);
    return obj;
  };

let select = (key: string) => (obj) =>
  Object.values(items(obj)).find((e: any) => e.key === key);

let iterate =
  (...transforms) =>
  (obj) => {
    Object.values(items(obj)).forEach(chain(...transforms));
    return obj;
  };

let modify = (key, val) => (obj) => {
  let v;

  if (typeof val !== "function") {
    v = () => val;
  } else {
    v = val;
  }

  (<any>select(key)(obj)).value = v(obj.value);
  return obj;
};

let remove = (key) => (obj) => {
  let i = items(obj);

  let found = Object.entries(i).find(([_, v]: [any, any]) => v.key === key);
  if (!found) {
    console.warn(`Key "${key}" not found in object`, obj);
    throw new Error(`Key "${key}" not found.`);
  }

  let [k, _] = found;
  i.splice(k, 1);

  return obj;
};

let append = (field) => (obj) => {
  items(obj).push(structuredClone(field));
  return obj;
};

let object = (key, type, value) => ({
  key: key,
  type: type,
  value: value,
});

let field = object;
let struct = (key, type, ty, fields) =>
  object(key, type, {
    items: fields ?? [],
    name: ty,
  });

let debug = (obj) => {
  console.dir(obj, { depth: 5 });
  return obj;
};

let print = (txt: string) => (obj) => {
  console.log(txt);
  return obj;
};

let rgba = (
  r: IntRange<0, 256>,
  g: IntRange<0, 256>,
  b: IntRange<0, 256>,
  a: number // 0.0 to 1.0
) => [r / 255, g / 255, b / 255, a];

let rgb = (r: IntRange<0, 256>, g: IntRange<0, 256>, b: IntRange<0, 256>) =>
  rgba(r, g, b, 1);

// Exports for bin pipeline.
export const b = {
  items,
  chain,
  select,
  iterate,
  modify,
  remove,
  append,
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
