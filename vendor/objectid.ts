type TextDecoder = {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
  decode(input?: Uint8Array): string;
};
type TextDecoderConstructor = {
  new (
    label: "utf8",
    options: { fatal: boolean; ignoreBOM?: boolean },
  ): TextDecoder;
};

// parse utf8 globals
declare const TextDecoder: TextDecoderConstructor;
let TextDecoderFatal: TextDecoder;
let TextDecoderNonFatal: TextDecoder;

/**
 * Determines if the passed in bytes are valid utf8
 * @param bytes - An array of 8-bit bytes. Must be indexable and have length property
 * @param start - The index to start validating
 * @param end - The index to end validating
 */
function parseUtf8(
  buffer: Uint8Array,
  start: number,
  end: number,
  fatal: boolean,
): string {
  if (fatal) {
    TextDecoderFatal ??= new TextDecoder("utf8", { fatal: true });
    try {
      return TextDecoderFatal.decode(buffer.subarray(start, end));
    } catch (cause) {
      throw new BSONError("Invalid UTF-8 string in BSON document", { cause });
    }
  }
  TextDecoderNonFatal ??= new TextDecoder("utf8", { fatal: false });
  return TextDecoderNonFatal.decode(buffer.subarray(start, end));
}

/**
 * This function is an optimization for small basic latin strings.
 * @internal
 * @remarks
 * ### Important characteristics:
 * - If the uint8array or distance between start and end is 0 this function returns an empty string
 * - If the byteLength of the string is 1, 2, or 3 we invoke String.fromCharCode and manually offset into the buffer
 * - If the byteLength of the string is less than or equal to 20 an array of bytes is built and `String.fromCharCode.apply` is called with the result
 * - If any byte exceeds 128 this function returns null
 *
 * @param uint8array - A sequence of bytes that may contain basic latin characters
 * @param start - The start index from which to search the uint8array
 * @param end - The index to stop searching the uint8array
 * @returns string if all bytes are within the basic latin range, otherwise null
 */
function tryReadBasicLatin(
  uint8array: Uint8Array,
  start: number,
  end: number,
): string | null {
  if (uint8array.length === 0) {
    return "";
  }

  const stringByteLength = end - start;
  if (stringByteLength === 0) {
    return "";
  }

  if (stringByteLength > 20) {
    return null;
  }

  if (stringByteLength === 1 && uint8array[start]! < 128) {
    return String.fromCharCode(uint8array[start]!);
  }

  if (
    stringByteLength === 2 &&
    uint8array[start]! < 128 &&
    uint8array[start + 1]! < 128
  ) {
    return (
      String.fromCharCode(uint8array[start]!) +
      String.fromCharCode(uint8array[start + 1]!)
    );
  }

  if (
    stringByteLength === 3 &&
    uint8array[start]! < 128 &&
    uint8array[start + 1]! < 128 &&
    uint8array[start + 2]! < 128
  ) {
    return (
      String.fromCharCode(uint8array[start]!) +
      String.fromCharCode(uint8array[start + 1]!) +
      String.fromCharCode(uint8array[start + 2]!)
    );
  }

  const latinBytes: number[] = [];
  for (let i = start; i < end; i++) {
    const byte = uint8array[i]!;
    if (byte > 127) {
      return null;
    }
    latinBytes.push(byte);
  }

  return String.fromCharCode(...latinBytes);
}

/**
 * This function is an optimization for writing small basic latin strings.
 * @internal
 * @remarks
 * ### Important characteristics:
 * - If the string length is 0 return 0, do not perform any work
 * - If a string is longer than 25 code units return null
 * - If any code unit exceeds 128 this function returns null
 *
 * @param destination - The uint8array to serialize the string to
 * @param source - The string to turn into UTF-8 bytes if it fits in the basic latin range
 * @param offset - The position in the destination to begin writing bytes to
 * @returns the number of bytes written to destination if all code units are below 128, otherwise null
 */
function tryWriteBasicLatin(
  destination: Uint8Array,
  source: string,
  offset: number,
): number | null {
  if (source.length === 0) return 0;

  if (source.length > 25) return null;

  if (destination.length - offset < source.length) return null;

  for (
    let charOffset = 0, destinationOffset = offset;
    charOffset < source.length;
    charOffset++, destinationOffset++
  ) {
    const char = source.charCodeAt(charOffset);
    if (char > 127) return null;

    destination[destinationOffset] = char;
  }

  return source.length;
}

type NodeJsEncoding = "hex" | "utf8" | "binary";
type NodeJsBuffer = ArrayBufferView &
  Uint8Array & {
    write(
      string: string,
      offset: number,
      length: undefined,
      encoding: "utf8",
    ): number;
    copy(
      target: Uint8Array,
      targetStart: number,
      sourceStart: number,
      sourceEnd: number,
    ): number;
    toString: (
      this: Uint8Array,
      encoding: NodeJsEncoding,
      start?: number,
      end?: number,
    ) => string;
    equals: (this: Uint8Array, other: Uint8Array) => boolean;
    swap32: (this: NodeJsBuffer) => NodeJsBuffer;
    compare: (this: Uint8Array, other: Uint8Array) => -1 | 0 | 1;
  };
type NodeJsBufferConstructor = Omit<Uint8ArrayConstructor, "from"> & {
  alloc: (size: number) => NodeJsBuffer;
  allocUnsafe: (size: number) => NodeJsBuffer;
  from(array: number[] | ArrayBufferView | Uint8Array): NodeJsBuffer;
  from(
    array: ArrayBufferLike,
    byteOffset: number,
    byteLength: number,
  ): NodeJsBuffer;
  from(base64: string, encoding: NodeJsEncoding): NodeJsBuffer;
  byteLength(input: string, encoding: "utf8"): number;
  isBuffer(value: unknown): value is NodeJsBuffer;
  concat(list: Uint8Array[]): NodeJsBuffer;
};

// This can be nullish, but we gate the nodejs functions on being exported whether or not this exists
// Node.js global
declare const Buffer: NodeJsBufferConstructor & {
  prototype?: { _isBuffer?: boolean };
};

/** @internal */
function nodejsMathRandomBytes(byteLength: number): NodeJsBuffer {
  return nodeJsByteUtils.fromNumberArray(
    Array.from({ length: byteLength }, () => Math.floor(Math.random() * 256)),
  );
}

/** @internal */
function nodejsSecureRandomBytes(byteLength: number): NodeJsBuffer {
  return crypto.getRandomValues(nodeJsByteUtils.allocate(byteLength));
}

const nodejsRandomBytes = (() => {
  const { crypto } = globalThis as {
    crypto?: { getRandomValues?: (space: Uint8Array) => Uint8Array };
  };
  if (crypto != null && typeof crypto.getRandomValues === "function") {
    return nodejsSecureRandomBytes;
  } else {
    return nodejsMathRandomBytes;
  }
})();

/**
 * @public
 * @experimental
 */
const nodeJsByteUtils = {
  toLocalBufferType(
    potentialBuffer: Uint8Array | NodeJsBuffer | ArrayBuffer,
  ): NodeJsBuffer {
    if (Buffer.isBuffer(potentialBuffer)) {
      return potentialBuffer;
    }

    if (ArrayBuffer.isView(potentialBuffer)) {
      return Buffer.from(
        potentialBuffer.buffer,
        potentialBuffer.byteOffset,
        potentialBuffer.byteLength,
      );
    }

    const stringTag =
      potentialBuffer?.[Symbol.toStringTag] ??
      Object.prototype.toString.call(potentialBuffer);
    if (
      stringTag === "ArrayBuffer" ||
      stringTag === "SharedArrayBuffer" ||
      stringTag === "[object ArrayBuffer]" ||
      stringTag === "[object SharedArrayBuffer]"
    ) {
      // @ts-expect-error Buffer.from accepts ArrayBuffer and SharedArrayBuffer
      return Buffer.from(potentialBuffer);
    }

    throw new BSONError(
      `Cannot create Buffer from the passed potentialBuffer.`,
    );
  },

  allocate(size: number): NodeJsBuffer {
    return Buffer.alloc(size);
  },

  allocateUnsafe(size: number): NodeJsBuffer {
    return Buffer.allocUnsafe(size);
  },

  concat(list: Uint8Array[]): NodeJsBuffer {
    return Buffer.concat(list);
  },

  copy(
    source: Uint8Array,
    target: Uint8Array,
    targetStart?: number,
    sourceStart?: number,
    sourceEnd?: number,
  ): number {
    return nodeJsByteUtils
      .toLocalBufferType(source)
      .copy(
        target,
        targetStart ?? 0,
        sourceStart ?? 0,
        sourceEnd ?? source.length,
      );
  },

  equals(a: Uint8Array, b: Uint8Array): boolean {
    return nodeJsByteUtils.toLocalBufferType(a).equals(b);
  },

  fromNumberArray(array: number[]): NodeJsBuffer {
    return Buffer.from(array);
  },

  fromUTF8(utf8: string): NodeJsBuffer {
    return Buffer.from(utf8, "utf8");
  },

  /** **Legacy** binary strings are an outdated method of data transfer. Do not add public API support for interpreting this format */
  fromISO88591(codePoints: string): NodeJsBuffer {
    return Buffer.from(codePoints, "binary");
  },

  /** **Legacy** binary strings are an outdated method of data transfer. Do not add public API support for interpreting this format */
  toISO88591(buffer: Uint8Array): string {
    return nodeJsByteUtils.toLocalBufferType(buffer).toString("binary");
  },

  fromHex(hex: string): NodeJsBuffer {
    return Buffer.from(hex, "hex");
  },

  toHex(buffer: Uint8Array): string {
    return nodeJsByteUtils.toLocalBufferType(buffer).toString("hex");
  },

  toUTF8(
    buffer: Uint8Array,
    start: number,
    end: number,
    fatal: boolean,
  ): string {
    const basicLatin =
      end - start <= 20 ? tryReadBasicLatin(buffer, start, end) : null;
    if (basicLatin != null) {
      return basicLatin;
    }

    const string = nodeJsByteUtils
      .toLocalBufferType(buffer)
      .toString("utf8", start, end);
    if (fatal) {
      for (let i = 0; i < string.length; i++) {
        if (string.charCodeAt(i) === 0xfffd) {
          parseUtf8(buffer, start, end, true);
          break;
        }
      }
    }
    return string;
  },

  utf8ByteLength(input: string): number {
    return Buffer.byteLength(input, "utf8");
  },

  encodeUTF8Into(
    buffer: Uint8Array,
    source: string,
    byteOffset: number,
  ): number {
    const latinBytesWritten = tryWriteBasicLatin(buffer, source, byteOffset);
    if (latinBytesWritten != null) {
      return latinBytesWritten;
    }

    return nodeJsByteUtils
      .toLocalBufferType(buffer)
      .write(source, byteOffset, undefined, "utf8");
  },

  randomBytes: nodejsRandomBytes,

  swap32(buffer: Uint8Array): NodeJsBuffer {
    return nodeJsByteUtils.toLocalBufferType(buffer).swap32();
  },
};

type TextEncoder = {
  readonly encoding: string;
  encode(input?: string): Uint8Array;
};
type TextEncoderConstructor = {
  new (): TextEncoder;
};

// Web global
declare const TextEncoder: TextEncoderConstructor;

type ArrayBufferViewWithTag = ArrayBufferView & {
  [Symbol.toStringTag]?: string;
};

function isReactNative() {
  const { navigator } = globalThis as { navigator?: { product?: string } };
  return typeof navigator === "object" && navigator.product === "ReactNative";
}

/** @internal */
function webMathRandomBytes(byteLength: number) {
  if (byteLength < 0) {
    throw new RangeError(
      `The argument 'byteLength' is invalid. Received ${byteLength}`,
    );
  }
  return webByteUtils.fromNumberArray(
    Array.from({ length: byteLength }, () => Math.floor(Math.random() * 256)),
  );
}

/** @internal */
const webRandomBytes: (byteLength: number) => Uint8Array = (() => {
  const { crypto } = globalThis as {
    crypto?: { getRandomValues?: (space: Uint8Array) => Uint8Array };
  };
  if (crypto != null && typeof crypto.getRandomValues === "function") {
    return (byteLength: number) => {
      // @ts-expect-error: crypto.getRandomValues cannot actually be null here
      // You cannot separate getRandomValues from crypto (need to have this === crypto)
      return crypto.getRandomValues(webByteUtils.allocate(byteLength));
    };
  } else {
    if (isReactNative()) {
      const { console } = globalThis as {
        console?: { warn?: (message: string) => void };
      };
      console?.warn?.(
        "BSON: For React Native please polyfill crypto.getRandomValues, e.g. using: https://www.npmjs.com/package/react-native-get-random-values.",
      );
    }
    return webMathRandomBytes;
  }
})();

const HEX_DIGIT = /(\d|[a-f])/i;

/**
 * @public
 * @experimental
 */
const webByteUtils = {
  toLocalBufferType(
    potentialUint8array: Uint8Array | ArrayBufferViewWithTag | ArrayBuffer,
  ): Uint8Array {
    const stringTag = String(
      potentialUint8array?.[Symbol.toStringTag] ??
        Object.prototype.toString.call(potentialUint8array),
    );

    if (stringTag === "Uint8Array") {
      return potentialUint8array as Uint8Array;
    }

    if (ArrayBuffer.isView(potentialUint8array)) {
      return new Uint8Array(
        potentialUint8array.buffer.slice(
          potentialUint8array.byteOffset,
          potentialUint8array.byteOffset + potentialUint8array.byteLength,
        ),
      );
    }

    if (
      stringTag === "ArrayBuffer" ||
      stringTag === "SharedArrayBuffer" ||
      stringTag === "[object ArrayBuffer]" ||
      stringTag === "[object SharedArrayBuffer]"
    ) {
      return new Uint8Array(potentialUint8array);
    }

    throw new BSONError(
      `Cannot make a Uint8Array from passed potentialBuffer.`,
    );
  },

  allocate(size: number): Uint8Array {
    if (typeof size !== "number") {
      throw new TypeError(
        `The "size" argument must be of type number. Received ${String(size)}`,
      );
    }
    return new Uint8Array(size);
  },

  allocateUnsafe(size: number): Uint8Array {
    return webByteUtils.allocate(size);
  },

  concat(uint8Arrays: Uint8Array[]): Uint8Array {
    if (uint8Arrays.length === 0) return webByteUtils.allocate(0);

    let totalLength = 0;
    for (const uint8Array of uint8Arrays) {
      totalLength += uint8Array.length;
    }

    const result = webByteUtils.allocate(totalLength);
    let offset = 0;

    for (const uint8Array of uint8Arrays) {
      result.set(uint8Array, offset);
      offset += uint8Array.length;
    }

    return result;
  },

  copy(
    source: Uint8Array,
    target: Uint8Array,
    targetStart?: number,
    sourceStart?: number,
    sourceEnd?: number,
  ): number {
    // validate and standardize passed-in sourceEnd
    if (sourceEnd !== undefined && sourceEnd < 0) {
      throw new RangeError(
        `The value of "sourceEnd" is out of range. It must be >= 0. Received ${sourceEnd}`,
      );
    }
    sourceEnd = sourceEnd ?? source.length;

    // validate and standardize passed-in sourceStart
    if (
      sourceStart !== undefined &&
      (sourceStart < 0 || sourceStart > sourceEnd)
    ) {
      throw new RangeError(
        `The value of "sourceStart" is out of range. It must be >= 0 and <= ${sourceEnd}. Received ${sourceStart}`,
      );
    }
    sourceStart = sourceStart ?? 0;

    // validate and standardize passed-in targetStart
    if (targetStart !== undefined && targetStart < 0) {
      throw new RangeError(
        `The value of "targetStart" is out of range. It must be >= 0. Received ${targetStart}`,
      );
    }
    targetStart = targetStart ?? 0;

    // figure out how many bytes we can copy
    const srcSlice = source.subarray(sourceStart, sourceEnd);
    const maxLen = Math.min(srcSlice.length, target.length - targetStart);
    if (maxLen <= 0) {
      return 0;
    }

    // perform the copy
    target.set(srcSlice.subarray(0, maxLen), targetStart);
    return maxLen;
  },

  equals(uint8Array: Uint8Array, otherUint8Array: Uint8Array): boolean {
    if (uint8Array.byteLength !== otherUint8Array.byteLength) {
      return false;
    }
    for (let i = 0; i < uint8Array.byteLength; i++) {
      if (uint8Array[i] !== otherUint8Array[i]) {
        return false;
      }
    }
    return true;
  },

  fromNumberArray(array: number[]): Uint8Array {
    return Uint8Array.from(array);
  },

  fromUTF8(utf8: string): Uint8Array {
    return new TextEncoder().encode(utf8);
  },

  /** **Legacy** binary strings are an outdated method of data transfer. Do not add public API support for interpreting this format */
  fromISO88591(codePoints: string): Uint8Array {
    return Uint8Array.from(codePoints, (c) => c.charCodeAt(0) & 0xff);
  },

  /** **Legacy** binary strings are an outdated method of data transfer. Do not add public API support for interpreting this format */
  toISO88591(uint8array: Uint8Array): string {
    return Array.from(Uint16Array.from(uint8array), (b) =>
      String.fromCharCode(b),
    ).join("");
  },

  fromHex(hex: string): Uint8Array {
    const evenLengthHex =
      hex.length % 2 === 0 ? hex : hex.slice(0, hex.length - 1);
    const buffer: number[] = [];

    for (let i = 0; i < evenLengthHex.length; i += 2) {
      const firstDigit = evenLengthHex[i]!;
      const secondDigit = evenLengthHex[i + 1]!;

      if (!HEX_DIGIT.test(firstDigit)) {
        break;
      }
      if (!HEX_DIGIT.test(secondDigit)) {
        break;
      }

      const hexDigit = Number.parseInt(`${firstDigit}${secondDigit}`, 16);
      buffer.push(hexDigit);
    }

    return Uint8Array.from(buffer);
  },

  toHex(uint8array: Uint8Array): string {
    return Array.from(uint8array, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  },

  toUTF8(
    uint8array: Uint8Array,
    start: number,
    end: number,
    fatal: boolean,
  ): string {
    const basicLatin =
      end - start <= 20 ? tryReadBasicLatin(uint8array, start, end) : null;
    if (basicLatin != null) {
      return basicLatin;
    }

    return parseUtf8(uint8array, start, end, fatal);
  },

  utf8ByteLength(input: string): number {
    return new TextEncoder().encode(input).byteLength;
  },

  encodeUTF8Into(
    uint8array: Uint8Array,
    source: string,
    byteOffset: number,
  ): number {
    const bytes = new TextEncoder().encode(source);
    uint8array.set(bytes, byteOffset);
    return bytes.byteLength;
  },

  randomBytes: webRandomBytes,

  swap32(buffer: Uint8Array): Uint8Array {
    if (buffer.length % 4 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    }

    for (let i = 0; i < buffer.length; i += 4) {
      const byte0 = buffer[i]!;
      const byte1 = buffer[i + 1]!;
      const byte2 = buffer[i + 2]!;
      const byte3 = buffer[i + 3]!;
      buffer[i] = byte3;
      buffer[i + 1] = byte2;
      buffer[i + 2] = byte1;
      buffer[i + 3] = byte0;
    }

    return buffer;
  },
};

/**
 * Check that a global Buffer exists that is a function and
 * does not have a '_isBuffer' property defined on the prototype
 * (this is to prevent using the npm buffer)
 */
const hasGlobalBuffer =
  // @ts-expect-error Buffer might not exist in all environments
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  typeof Buffer === "function" && Buffer.prototype?._isBuffer !== true;

/**
 * This is the only ByteUtils that should be used across the rest of the BSON library.
 *
 * The type annotation is important here, it asserts that each of the platform specific
 * utils implementations are compatible with the common one.
 *
 * @public
 * @experimental
 */
const ByteUtils = hasGlobalBuffer ? nodeJsByteUtils : webByteUtils;

/** Writes a big-endian 32-bit integer to destination, can be signed or unsigned */
function setInt32BE(destination: Uint8Array, offset: number, value: number): 4 {
  destination[offset + 3] = value;
  value >>>= 8;
  destination[offset + 2] = value;
  value >>>= 8;
  destination[offset + 1] = value;
  value >>>= 8;
  destination[offset] = value;
  return 4;
}

function isMap(value: unknown): value is Map<unknown, unknown> {
  return (
    typeof value === "object" &&
    value != null &&
    Symbol.toStringTag in value &&
    value[Symbol.toStringTag] === "Map"
  );
}

type InspectFn = (x: unknown, options?: unknown) => string;
function defaultInspect(x: unknown, _options?: unknown): string {
  return JSON.stringify(x, (k: string, v: unknown) => {
    if (typeof v === "bigint") return { $numberLong: `${v}` };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (isMap(v)) return Object.fromEntries(v);

    return v;
  });
}

/**
 * @public
 * @category Error
 *
 * `BSONError` objects are thrown when BSON encounters an error.
 *
 * This is the parent class for all the other errors thrown by this library.
 */
class BSONError extends Error {
  /**
   * @internal
   * The underlying algorithm for isBSONError may change to improve how strict it is
   * about determining if an input is a BSONError. But it must remain backwards compatible
   * with previous minors & patches of the current major version.
   */
  protected get bsonError(): true {
    return true;
  }

  override get name(): string {
    return "BSONError";
  }

  /**
   * @public
   *
   * All errors thrown from the BSON library inherit from `BSONError`.
   * This method can assist with determining if an error originates from the BSON library
   * even if it does not pass an `instanceof` check against this class' constructor.
   *
   * @param value - any javascript value that needs type checking
   */
  public static isBSONError(value: unknown): value is BSONError {
    return (
      value != null &&
      typeof value === "object" &&
      "bsonError" in value &&
      value.bsonError === true &&
      // Do not access the following properties, just check existence
      "name" in value &&
      "message" in value &&
      "stack" in value
    );
  }
}

/** @internal */
const BSON_MAJOR_VERSION = 7;

/** @internal */
const BSON_VERSION_SYMBOL = Symbol.for("@@mdb.bson.version");

/** @public */
type BSONTypeTag =
  | "BSONRegExp"
  | "BSONSymbol"
  | "ObjectId"
  | "Binary"
  | "Decimal128"
  | "Double"
  | "Int32"
  | "Long"
  | "MaxKey"
  | "MinKey"
  | "Timestamp"
  | "Code"
  | "DBRef";

/** @public */
const bsonType = Symbol.for("@@mdb.bson.type");

/** @public */
abstract class BSONValue {
  /** @public */
  public abstract get _bsontype(): BSONTypeTag;

  public get [bsonType](): this["_bsontype"] {
    return this._bsontype;
  }

  /** @internal */
  get [BSON_VERSION_SYMBOL](): typeof BSON_MAJOR_VERSION {
    return BSON_MAJOR_VERSION;
  }

  [Symbol.for("nodejs.util.inspect.custom")](
    depth?: number,
    options?: unknown,
    inspect?: InspectFn,
  ): string {
    return this.inspect(depth, options, inspect);
  }

  /**
   * @public
   * Prints a human-readable string of BSON value information
   * If invoked manually without node.js.inspect function, this will default to a modified JSON.stringify
   */
  public abstract inspect(
    depth?: number,
    options?: unknown,
    inspect?: InspectFn,
  ): string;

  /** @internal */
  abstract toExtendedJSON(): unknown;
}

/** ObjectId hexString cache @internal */
const __idCache = new WeakMap<ObjectId, string>(); // TODO(NODE-6549): convert this to #__id private field when target updated to ES2022

/** byte (0-255): its 2-character lowercase hex pair @internal */
const byteToHex: string[] = [];
for (let n = 0; n < 256; n++) byteToHex.push(n.toString(16).padStart(2, "0"));

/** hex char code: nibble (0-15); indices are the codes of 0-9, a-f, A-F @internal */
const hexCharCodeToNibble = new Int8Array(103);
for (let c = 48; c <= 57; c++) hexCharCodeToNibble[c] = c - 48; // '0'-'9'
for (let c = 65; c <= 70; c++) hexCharCodeToNibble[c] = c - 55; // 'A'-'F'
for (let c = 97; c <= 102; c++) hexCharCodeToNibble[c] = c - 87; // 'a'-'f'

/** @public */
interface ObjectIdLike {
  id: string | Uint8Array;
  __id?: string;
  toHexString(): string;
}

/** @public */
interface ObjectIdExtended {
  $oid: string;
}

/**
 * A class representation of the BSON ObjectId type.
 * @public
 * @category BSONType
 */
export class ObjectId extends BSONValue {
  get _bsontype(): "ObjectId" {
    return "ObjectId";
  }

  /** @internal */
  private static index = 0;

  /** Unique sequence for the current process (initialized on first use)
   * @internal
   */
  private static PROCESS_UNIQUE: Uint8Array | null = null;

  /** @internal */
  private static resetState = (): void => {
    this.index = Math.floor(Math.random() * 0x1000000);
    // PROCESS_UNIQUE is (re)generated lazily on first use rather than here, so that merely loading
    // BSON never calls secure random at module-evaluation time. Runtimes such as Cloudflare Workers
    // forbid generating random values in the global scope.
    this.PROCESS_UNIQUE = null;
  };

  static {
    this.resetState();

    let v8Module: typeof import("v8") | undefined;
    let isBuildingSnapshot: boolean | undefined = false;
    // getBuiltinModule is wrapped in a try..catch due to
    // https://github.com/vercel/next.js/issues/98226.
    //
    // The NextJS Edge runtime
    // implements getBuiltInModule with a throwable stub, which we protect
    // against so our users are operable across this popular runtime.
    try {
      v8Module = globalThis?.process?.getBuiltinModule?.("v8") ?? {};
    } catch {
      // Suppress
    }

    // https://nodejs.org/api/v8.html#startup-snapshot-api
    const startupSnapshot = v8Module?.startupSnapshot;

    // isBuildingSnapshot is wrapped in a try..catch due to
    // https://github.com/oven-sh/bun/issues/32501
    //
    // Bun implements isBuildingSnapshot with a throwable stub, which we also
    // protect against for the same reason as getBuiltInModule.
    try {
      isBuildingSnapshot = startupSnapshot?.isBuildingSnapshot?.();
    } catch {
      // Suppress
    }
    if (isBuildingSnapshot) {
      startupSnapshot?.addDeserializeCallback?.(this.resetState);
    }
  }

  static cacheHexString: boolean;

  /**
   * The 12 ObjectId bytes packed as four 24-bit integers (bytes 0-2, 3-5, 6-8, 9-11).
   * The 24-bit width keeps each value inside V8's small-integer (Smi) range so it stays stored
   * inline, which keeps the object small. The fields are enumerable own properties, so two
   * ObjectIds with the same bytes stay equal under structural comparison such as deepStrictEqual.
   * @internal
   */
  private i0!: number;
  /** @internal */
  private i1!: number;
  /** @internal */
  private i2!: number;
  /** @internal */
  private i3!: number;

  /** Pack 12 bytes into the four integer fields. @internal */
  private setFromBytes(b: Uint8Array, offset = 0): void {
    this.i0 = (b[offset]! << 16) | (b[offset + 1]! << 8) | b[offset + 2]!;
    this.i1 = (b[offset + 3]! << 16) | (b[offset + 4]! << 8) | b[offset + 5]!;
    this.i2 = (b[offset + 6]! << 16) | (b[offset + 7]! << 8) | b[offset + 8]!;
    this.i3 = (b[offset + 9]! << 16) | (b[offset + 10]! << 8) | b[offset + 11]!;
  }

  /**
   * Pack a validated 24-character hex string into the four integer fields. The caller must have
   * already validated the string; every character is assumed to be a hex digit.
   * @internal
   */
  private setFromHex(s: string): void {
    const t = hexCharCodeToNibble;
    this.i0 =
      (t[s.charCodeAt(0)]! << 20) |
      (t[s.charCodeAt(1)]! << 16) |
      (t[s.charCodeAt(2)]! << 12) |
      (t[s.charCodeAt(3)]! << 8) |
      (t[s.charCodeAt(4)]! << 4) |
      t[s.charCodeAt(5)]!;
    this.i1 =
      (t[s.charCodeAt(6)]! << 20) |
      (t[s.charCodeAt(7)]! << 16) |
      (t[s.charCodeAt(8)]! << 12) |
      (t[s.charCodeAt(9)]! << 8) |
      (t[s.charCodeAt(10)]! << 4) |
      t[s.charCodeAt(11)]!;
    this.i2 =
      (t[s.charCodeAt(12)]! << 20) |
      (t[s.charCodeAt(13)]! << 16) |
      (t[s.charCodeAt(14)]! << 12) |
      (t[s.charCodeAt(15)]! << 8) |
      (t[s.charCodeAt(16)]! << 4) |
      t[s.charCodeAt(17)]!;
    this.i3 =
      (t[s.charCodeAt(18)]! << 20) |
      (t[s.charCodeAt(19)]! << 16) |
      (t[s.charCodeAt(20)]! << 12) |
      (t[s.charCodeAt(21)]! << 8) |
      (t[s.charCodeAt(22)]! << 4) |
      t[s.charCodeAt(23)]!;
  }

  /** To generate a new ObjectId, use ObjectId() with no argument. */
  /**
   * Create ObjectId from a 24 character hex string.
   *
   * @param inputId - A 24 character hex string.
   */
  /**
   * Create ObjectId from the BSON ObjectId type.
   *
   * @param inputId - The BSON ObjectId type.
   */
  /**
   * Create ObjectId from the object type that has the toHexString method.
   *
   * @param inputId - The ObjectIdLike type.
   */
  /**
   * Create ObjectId from a 12 byte binary Buffer.
   *
   * @param inputId - A 12 byte binary Buffer.
   */
  /**
   * Implementation overload.
   *
   * @param inputId - All input types that are used in the constructor implementation.
   */
  constructor(inputId?: string | ObjectId | ObjectIdLike | Uint8Array);
  /**
   * Read 12 bytes from `source` starting at `offset` directly into the packed fields.
   * Used by the deserializer on a hot path.
   * @internal
   */
  constructor(source: Uint8Array, offset: number);
  /**
   * Create a new ObjectId.
   *
   * @param inputId - An input value to create a new ObjectId from.
   */
  constructor(
    inputId?: string | ObjectId | ObjectIdLike | Uint8Array,
    offset?: number,
  ) {
    super();
    if (typeof offset === "number") {
      // Fast path used by the deserializer: read the 12 bytes directly from source at offset.
      this.setFromBytes(inputId as Uint8Array, offset);
      return;
    }
    // workingId is set based on type of input and whether valid id exists for the input
    let workingId;
    if (typeof inputId === "object" && inputId && "id" in inputId) {
      if (
        ObjectId.is(inputId) &&
        typeof inputId.i0 === "number" &&
        typeof inputId.i1 === "number" &&
        typeof inputId.i2 === "number" &&
        typeof inputId.i3 === "number"
      ) {
        // Same-build ObjectId: copy the packed fields directly. The general path below would
        // hit the id getter (which allocates) and then re-decode a hex round trip.
        this.i0 = inputId.i0;
        this.i1 = inputId.i1;
        this.i2 = inputId.i2;
        this.i3 = inputId.i3;
        return;
      }
      if (typeof inputId.id !== "string" && !ArrayBuffer.isView(inputId.id)) {
        throw new BSONError(
          "Argument passed in must have an id that is of type string or Buffer",
        );
      }
      if (
        "toHexString" in inputId &&
        typeof inputId.toHexString === "function"
      ) {
        workingId = ByteUtils.fromHex(inputId.toHexString());
      } else {
        workingId = inputId.id;
      }
    } else {
      workingId = inputId;
    }

    // The following cases use workingId to construct an ObjectId
    if (workingId == null) {
      // The most common use case (blank id, new objectId instance):
      // generate a new id directly into the packed fields.
      const time = Math.floor(Date.now() / 1000);
      const inc = ObjectId.getInc();
      const pu = (ObjectId.PROCESS_UNIQUE ??= ByteUtils.randomBytes(5));
      this.i0 = (time >>> 8) & 0xffffff;
      this.i1 = ((time & 0xff) << 16) | (pu[0]! << 8) | pu[1]!;
      this.i2 = (pu[2]! << 16) | (pu[3]! << 8) | pu[4]!;
      this.i3 = inc & 0xffffff;
    } else if (ArrayBuffer.isView(workingId) && workingId.byteLength === 12) {
      // Normalize a non-Uint8Array view (DataView, Int8Array, ...) to a byte buffer so its
      // bytes are read correctly.
      this.setFromBytes(
        workingId instanceof Uint8Array
          ? workingId
          : ByteUtils.toLocalBufferType(workingId),
      );
    } else if (typeof workingId === "string") {
      if (ObjectId.validateHexString(workingId)) {
        this.setFromHex(workingId);
        // If we are caching the hex string
        if (ObjectId.cacheHexString) {
          __idCache.set(this, workingId);
        }
      } else {
        throw new BSONError(
          "input must be a 24 character hex string, 12 byte Uint8Array, or an integer",
        );
      }
    } else {
      throw new BSONError(
        "Argument passed in does not match the accepted types",
      );
    }
  }

  /**
   * The ObjectId bytes, rebuilt from the packed integer fields on each access. Every read
   * returns a freshly allocated 12-byte buffer.
   * @readonly
   */
  get id(): Uint8Array {
    const b = ByteUtils.allocateUnsafe(12);
    b[0] = (this.i0 >>> 16) & 0xff;
    b[1] = (this.i0 >>> 8) & 0xff;
    b[2] = this.i0 & 0xff;
    b[3] = (this.i1 >>> 16) & 0xff;
    b[4] = (this.i1 >>> 8) & 0xff;
    b[5] = this.i1 & 0xff;
    b[6] = (this.i2 >>> 16) & 0xff;
    b[7] = (this.i2 >>> 8) & 0xff;
    b[8] = this.i2 & 0xff;
    b[9] = (this.i3 >>> 16) & 0xff;
    b[10] = (this.i3 >>> 8) & 0xff;
    b[11] = this.i3 & 0xff;
    return b;
  }

  set id(value: Uint8Array) {
    const bytes =
      value instanceof Uint8Array ? value : ByteUtils.toLocalBufferType(value);
    this.setFromBytes(bytes);
    if (ObjectId.cacheHexString) {
      __idCache.set(this, ByteUtils.toHex(bytes));
    }
  }

  /**
   * @internal
   * Validates the input string is a valid hex representation of an ObjectId.
   */
  private static validateHexString(string: string): boolean {
    if (string?.length !== 24) return false;
    for (let i = 0; i < 24; i++) {
      const char = string.charCodeAt(i);
      if (
        // Check for ASCII 0-9
        (char >= 48 && char <= 57) ||
        // Check for ASCII a-f
        (char >= 97 && char <= 102) ||
        // Check for ASCII A-F
        (char >= 65 && char <= 70)
      ) {
        continue;
      }
      return false;
    }
    return true;
  }

  /** Returns the ObjectId id as a 24 lowercase character hex string representation */
  toHexString(): string {
    if (ObjectId.cacheHexString) {
      const __id = __idCache.get(this);
      if (__id) return __id;
    }

    // Encode the four packed integers to hex via a byte->pair lookup table.
    const i0 = this.i0;
    const i1 = this.i1;
    const i2 = this.i2;
    const i3 = this.i3;
    const hexString =
      byteToHex[(i0 >>> 16) & 0xff]! +
      byteToHex[(i0 >>> 8) & 0xff]! +
      byteToHex[i0 & 0xff]! +
      byteToHex[(i1 >>> 16) & 0xff]! +
      byteToHex[(i1 >>> 8) & 0xff]! +
      byteToHex[i1 & 0xff]! +
      byteToHex[(i2 >>> 16) & 0xff]! +
      byteToHex[(i2 >>> 8) & 0xff]! +
      byteToHex[i2 & 0xff]! +
      byteToHex[(i3 >>> 16) & 0xff]! +
      byteToHex[(i3 >>> 8) & 0xff]! +
      byteToHex[i3 & 0xff]!;

    if (ObjectId.cacheHexString) {
      __idCache.set(this, hexString);
    }

    return hexString;
  }

  /**
   * Update the ObjectId index
   * @internal
   */
  private static getInc(): number {
    return (ObjectId.index = (ObjectId.index + 1) % 0x1000000);
  }

  /**
   * Generate a 12 byte id buffer used in ObjectId's
   *
   * @param time - pass in a second based timestamp.
   */
  static generate(time?: number): Uint8Array {
    if ("number" !== typeof time) {
      time = Math.floor(Date.now() / 1000);
    }

    const inc = ObjectId.getInc();
    const buffer = ByteUtils.allocateUnsafe(12);

    // 4-byte timestamp
    setInt32BE(buffer, 0, time);

    // 5-byte process unique (generated lazily on first use, see NODE-7667)
    const PROCESS_UNIQUE = (this.PROCESS_UNIQUE ??= ByteUtils.randomBytes(5));
    buffer[4] = PROCESS_UNIQUE[0]!;
    buffer[5] = PROCESS_UNIQUE[1]!;
    buffer[6] = PROCESS_UNIQUE[2]!;
    buffer[7] = PROCESS_UNIQUE[3]!;
    buffer[8] = PROCESS_UNIQUE[4]!;

    // 3-byte counter
    buffer[11] = inc & 0xff;
    buffer[10] = (inc >>> 8) & 0xff;
    buffer[9] = (inc >>> 16) & 0xff;

    return buffer;
  }

  /**
   * Converts the id into a 24 character hex string for printing, unless encoding is provided.
   * @param encoding - hex or base64
   */
  toString(encoding?: "hex"): string {
    if (encoding === "hex") return this.toHexString();
    return this.toHexString();
  }

  /** Converts to its JSON the 24 character hex string representation. */
  toJSON(): string {
    return this.toHexString();
  }

  /** @internal */
  private static is(variable: unknown): variable is ObjectId {
    return (
      variable != null &&
      typeof variable === "object" &&
      "_bsontype" in variable &&
      variable._bsontype === "ObjectId"
    );
  }

  /**
   * Compares the equality of this ObjectId with `otherID`.
   *
   * @param otherId - ObjectId instance to compare against.
   */
  equals(
    otherId: string | ObjectId | ObjectIdLike | undefined | null,
  ): boolean {
    if (otherId === undefined || otherId === null) {
      return false;
    }

    if (
      ObjectId.is(otherId) &&
      typeof otherId.i0 === "number" &&
      typeof otherId.i1 === "number" &&
      typeof otherId.i2 === "number" &&
      typeof otherId.i3 === "number"
    ) {
      // Same-build ObjectId (all four packed fields present): compare them directly. i3 (the
      // counter / low bytes) differs most often between two ids, so checking it first fails fast.
      return (
        this.i3 === otherId.i3 &&
        this.i0 === otherId.i0 &&
        this.i1 === otherId.i1 &&
        this.i2 === otherId.i2
      );
    }

    if (typeof otherId === "string") {
      return otherId.toLowerCase() === this.toHexString();
    }

    if (
      typeof otherId === "object" &&
      typeof otherId.toHexString === "function"
    ) {
      // ObjectId-like values, and ObjectIds from a different bson build, compare by their
      // public hex representation.
      const otherIdString = otherId.toHexString();
      const thisIdString = this.toHexString();
      return (
        typeof otherIdString === "string" &&
        otherIdString.toLowerCase() === thisIdString
      );
    }

    return false;
  }

  /** Returns the generation date (accurate up to the second) that this ID was generated. */
  getTimestamp(): Date {
    const timestamp = new Date();
    // Bytes 0-3 (the big-endian timestamp) are i0's three bytes followed by i1's top byte.
    const time = this.i0 * 0x100 + (this.i1 >>> 16);
    timestamp.setTime(time * 1000);
    return timestamp;
  }

  /** @internal */
  static createPk(): ObjectId {
    return new ObjectId();
  }

  /** @internal */
  serializeInto(uint8array: Uint8Array, index: number): 12 {
    uint8array[index] = (this.i0 >>> 16) & 0xff;
    uint8array[index + 1] = (this.i0 >>> 8) & 0xff;
    uint8array[index + 2] = this.i0 & 0xff;
    uint8array[index + 3] = (this.i1 >>> 16) & 0xff;
    uint8array[index + 4] = (this.i1 >>> 8) & 0xff;
    uint8array[index + 5] = this.i1 & 0xff;
    uint8array[index + 6] = (this.i2 >>> 16) & 0xff;
    uint8array[index + 7] = (this.i2 >>> 8) & 0xff;
    uint8array[index + 8] = this.i2 & 0xff;
    uint8array[index + 9] = (this.i3 >>> 16) & 0xff;
    uint8array[index + 10] = (this.i3 >>> 8) & 0xff;
    uint8array[index + 11] = this.i3 & 0xff;
    return 12;
  }

  /**
   * Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.
   *
   * @param time - an integer number representing a number of seconds.
   */
  static createFromTime(time: number): ObjectId {
    const buffer = ByteUtils.allocate(12);
    for (let i = 11; i >= 4; i--) buffer[i] = 0;
    // Encode time into first 4 bytes
    setInt32BE(buffer, 0, time);
    // Return the new objectId
    return new ObjectId(buffer);
  }

  /**
   * Creates an ObjectId from a hex string representation of an ObjectId.
   *
   * @param hexString - create a ObjectId from a passed in 24 character hexstring.
   */
  static createFromHexString(hexString: string): ObjectId {
    if (hexString?.length !== 24) {
      throw new BSONError("hex string must be 24 characters");
    }

    return new ObjectId(ByteUtils.fromHex(hexString));
  }

  /**
   * Checks if a value can be used to create a valid bson ObjectId
   * @param id - any JS value
   */
  static isValid(id: string | ObjectId | ObjectIdLike | Uint8Array): boolean {
    if (id == null) return false;
    if (typeof id === "string") return ObjectId.validateHexString(id);

    try {
      new ObjectId(id);
      return true;
    } catch {
      return false;
    }
  }

  /** @internal */
  toExtendedJSON(): ObjectIdExtended {
    if (this.toHexString) return { $oid: this.toHexString() };
    return { $oid: this.toString("hex") };
  }

  /** @internal */
  static fromExtendedJSON(doc: ObjectIdExtended): ObjectId {
    return new ObjectId(doc.$oid);
  }

  /** @internal */
  private isCached(): boolean {
    return ObjectId.cacheHexString && __idCache.has(this);
  }

  /**
   * Converts to a string representation of this Id.
   *
   * @returns return the 24 character hex string representation.
   */
  inspect(depth?: number, options?: unknown, inspect?: InspectFn): string {
    inspect ??= defaultInspect;
    return `new ObjectId(${inspect(this.toHexString(), options)})`;
  }
}
