type ToInterface<TUnion extends { type: string }> = {
  [K in TUnion["type"]]: Extract<TUnion, { type: K; data: any }>["data"];
};

export type VBool = { type: "bool"; data: boolean };
export type VI8 = { type: "i8"; data: number };
export type VU8 = { type: "u8"; data: number };
export type VI16 = { type: "i16"; data: number };
export type VU16 = { type: "u16"; data: number };
export type VI32 = { type: "i32"; data: number };
export type VU32 = { type: "u32"; data: number };
export type VI64 = { type: "i64"; data: bigint };
export type VU64 = { type: "u64"; data: bigint };
export type VF32 = { type: "f32"; data: number };
export type VVec2 = { type: "vec2"; data: [number, number] };
export type VVec3 = { type: "vec3"; data: [number, number, number] };
export type VVec4 = { type: "vec4"; data: [number, number, number, number] };
export type VMtx44 = { type: "mtx44"; data: any }; // Placeholder, needs proper type
export type VRgba = { type: "rgba"; data: [number, number, number, number] };
export type VStr = { type: "string"; data: string };
export type VHash = { type: "hash"; data: string };
export type VFile = { type: "file"; data: any }; // Placeholder, needs proper
export type VLink = { type: "link"; data: any }; // Placeholder, needs proper
export type VFlag = { type: "flag"; data: boolean };

export type VPrim =
  | VBool
  | VI8
  | VU8
  | VI16
  | VU16
  | VI32
  | VU32
  | VI64
  | VU64
  | VF32
  | VVec2
  | VVec3
  | VVec4
  | VMtx44
  | VRgba
  | VStr
  | VHash
  | VFile
  | VLink
  | VFlag;

export type VList = {
  type: "list";
  data: {
    items: Value[];
    valueType: keyof IFull;
  };
};

export type VList2 = {
  type: "list2";
  data: {
    items: Value[];
    valueType: keyof IFull;
  };
};

export type VOption = {
  type: "option";
  data: {
    items: [Value] | [];
    valueType: keyof IFull;
  };
};

export type VMap = {
  type: "map";
  data: {
    keyType: keyof IFull;
    valueType: keyof IFull;
    items: { [key: string]: Value };
  };
};

export type VPointer = {
  type: "pointer";
  data: {
    items: { [key: string]: Value };
    name: string;
  };
};

export type VEmbed = {
  type: "embed";
  data: {
    items: { [key: string]: Value };
    name: string;
  };
};

export type Value = VPrim | VList | VList2 | VOption | VMap | VPointer | VEmbed;

export type IPrim = ToInterface<VPrim>;
export type IFull = IPrim & {
  pointer: { [key: string]: Value };
  list: Value[];
  list2: Value[];
  option: Value | null;
  map: Record<string, Value>;
  embed: { [key: string]: Value };
};

export type VArray<T extends keyof IFull> = {
  type: T;
  data: IFull[T][];
};

const error = (msg: string): never => {
  throw new Error(msg);
};

// Type builders for creating primitives.
export const bool = (data: boolean): Value => ({ type: "bool", data });
export const i8 = (data: number): Value => ({ type: "i8", data });
export const u8 = (data: number): Value => ({ type: "u8", data });
export const i16 = (data: number): Value => ({ type: "i16", data });
export const u16 = (data: number): Value => ({ type: "u16", data });
export const i32 = (data: number): Value => ({ type: "i32", data });
export const u32 = (data: number): Value => ({ type: "u32", data });
export const i64 = (data: bigint): Value => ({ type: "i64", data });
export const u64 = (data: bigint): Value => ({ type: "u64", data });
export const f32 = (data: number): Value => ({ type: "f32", data });
export const vec2 = (data: [number, number]): Value => ({ type: "vec2", data });
export const vec3 = (data: [number, number, number]): Value => ({ type: "vec3", data });
export const vec4 = (data: [number, number, number, number]): Value => ({ type: "vec4", data });
export const mtx44 = (data: any) => error("mtx44 type is not implemented yet");
export const rgba = (data: [number, number, number, number]): Value => ({ type: "rgba", data });
export const str = (data: string): Value => ({ type: "string", data });
export const hash = (data: string): Value => ({ type: "hash", data });
export const file = (data: any): Value => error("file type is not implemented yet");
export const link = (data: any): Value => error("link type is not implemented yet");
export const flag = (data: boolean): Value => ({ type: "flag", data });

const buildPrim = {
  bool,
  i8,
  u8,
  i16,
  u16,
  i32,
  u32,
  i64,
  u64,
  f32,
  vec2,
  vec3,
  vec4,
  mtx44,
  rgba,
  string: str,
  hash,
  file,
  link,
  flag,
};

function isPrimType(key: keyof IFull): key is keyof typeof buildPrim {
  return key in buildPrim;
}

type RType<K> = K extends keyof typeof buildPrim ? Parameters<(typeof buildPrim)[K]>[0] : Value;

function rWrapOne<K extends keyof IFull>(valueType: K, item: RType<K>): Value {
  if (isPrimType(valueType)) {
    const builder = <(data: any) => any>buildPrim[valueType as keyof IPrim];
    return builder(item);
  } else {
    return item as Value;
  }
}

function rWrapArr<K extends keyof IFull>(valueType: K, items: RType<K>[]): Value[] {
  if (isPrimType(valueType)) {
    const builder = <(data: any) => any>buildPrim[valueType as keyof IPrim];
    return (items as any[]).map((item) => builder(item));
  } else {
    return items as Value[];
  }
}

export const list = <K extends keyof IFull>(valueType: K, items: RType<K>[]): Value => ({
  type: "list",
  data: { items: rWrapArr(valueType, items), valueType },
});

export const list2 = <K extends keyof IFull>(valueType: K, items: RType<K>[]): Value => ({
  type: "list2",
  data: { items: rWrapArr(valueType, items), valueType },
});

export const option = <K extends keyof IFull>(valueType: K, item?: RType<K>): Value => ({
  type: "option",
  data: {
    items: item !== undefined ? [rWrapOne(valueType, item)] : [],
    valueType,
  },
});

export const map = <K extends keyof IFull, V extends keyof IFull>(
  keyType: K,
  valueType: V,
  items: { [key: string]: RType<V> },
): Value => ({
  type: "map",
  data: {
    keyType,
    valueType,
    items: Object.fromEntries(Object.entries(items).map(([key, item]) => [key, rWrapOne(valueType, item)])),
  },
});

export const embed = (name: string, items: { [name: string]: Value }): Value => ({
  type: "embed",
  data: { items, name },
});

export const pointer = (name: string, items: { [name: string]: Value }): Value => ({
  type: "pointer",
  data: { items, name },
});

export namespace convert {
  type VListLike = VList | VList2 | VOption;
  type VStructLike = VEmbed | VPointer;

  let val2bin: { [x in keyof IFull]: (x: Value) => any };

  const v2bList = (i: VListLike): any => {
    return {
      valueType: i.data.valueType,
      items: i.data.items.map(val2bin[i.data.valueType]),
    };
  };

  const v2bMap = (i: VMap): any => {
    return {
      valueType: i.data.valueType,
      keyType: i.data.keyType,
      items: Object.entries(i.data.items).map(([key, value]) => ({
        key,
        value: val2bin[i.data.valueType](value),
      })),
    };
  };

  const v2bStruct = (i: VStructLike): any => ({
    name: i.data.name,
    items: [
      ...Object.entries(i.data.items).map(([key, value]) => ({
        key,
        type: value.type,
        value: val2bin[value.type](value),
      })),
    ],
  });

  val2bin = {
    bool: (x) => x.data,
    i8: (x) => x.data,
    u8: (x) => x.data,
    i16: (x) => x.data,
    u16: (x) => x.data,
    i32: (x) => x.data,
    u32: (x) => x.data,
    i64: (x) => x.data,
    u64: (x) => x.data,
    f32: (x) => x.data,
    vec2: (x) => x.data,
    vec3: (x) => x.data,
    vec4: (x) => x.data,
    mtx44: (x) => x.data, // Placeholder, needs proper serialization
    rgba: (x) => x.data,
    string: (x) => x.data,
    hash: (x) => x.data,
    file: (x) => x.data, // Placeholder, needs proper serialization
    link: (x) => x.data, // Placeholder, needs proper serialization
    flag: (x) => x.data,

    list: (x) => v2bList(x as VListLike),
    list2: (x) => v2bList(x as VListLike),
    option: (x) => v2bList(x as VListLike),

    embed: (x) => v2bStruct(x as VStructLike),
    pointer: (x) => v2bStruct(x as VPointer),
    map: (x) => v2bMap(x as VMap),
  };

  export const from = val2bin;
}

export const val2bin = (value: Value): any => convert.from[value.type](value);

export const v = {
  bool,
  i8,
  u8,
  i16,
  u16,
  i32,
  u32,
  i64,
  u64,
  f32,
  vec2,
  vec3,
  vec4,
  mtx44,
  rgba,
  str,
  hash,
  file,
  link,
  flag,
  list,
  list2,
  option,
  map,
  embed,
  pointer,

  val2bin,
};
