// Minimal ZIP writer (STORE, no compression) — sufficient for markdown spec exports.
// ponytail: swap to CompressionStream('deflate-raw') only if archives grow large.

const CRC_TABLE = new Uint32Array(256).map((_, i) => {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { name: string; content: string };

const DOS_TIME = 0;
// Fixed DOS date 2020-01-01; timestamps add no value for static spec exports.
const DOS_DATE = 20513;
const UTF8_FLAG = 0x0800;

export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const locals: Uint8Array<ArrayBuffer>[] = [];
  const centrals: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
  const u32 = (v: number) =>
    new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);

  for (const { name, content } of entries) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);

    locals.push(
      u32(0x04034b50), u16(20), u16(UTF8_FLAG), u16(0), u16(DOS_TIME), u16(DOS_DATE),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0),
      nameBytes, data,
    );

    centrals.push(
      u32(0x02014b50), u16(20), u16(20), u16(UTF8_FLAG), u16(0), u16(DOS_TIME), u16(DOS_DATE),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), nameBytes,
    );

    offset += 30 + nameBytes.length + data.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end: Uint8Array[] = [
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralSize), u32(offset), u16(0),
  ];

  const parts = [...locals, ...centrals, ...end];
  const out = new Uint8Array(new ArrayBuffer(parts.reduce((sum, part) => sum + part.length, 0)));
  let o = 0;
  for (const part of parts) {
    out.set(part, o);
    o += part.length;
  }

  return new Blob([out], { type: 'application/zip' });
}
