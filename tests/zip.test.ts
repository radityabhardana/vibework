import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, createZip } from '../src/lib/zip';

const encoder = new TextEncoder();
const readU16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const readU32 = (b: Uint8Array, o: number) =>
  (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

test('crc32 matches the IEEE known vector', () => {
  assert.equal(crc32(encoder.encode('123456789')), 0xcbf43926);
});

test('zip starts with local header and ends with EOCD', async () => {
  const blob = createZip([{ name: 'README.md', content: 'hello' }]);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  assert.equal(readU32(bytes, 0), 0x04034b50);
  const eocdOffset = bytes.length - 22;
  assert.equal(readU32(bytes, eocdOffset), 0x06054b50);
});

test('zip central directory lists entries and stored data round-trips', async () => {
  const entries = [
    { name: 'README.md', content: '# Demo\n\nSpec archive\n' },
    { name: 'PRD.md', content: '# PRD\n\nProduct requirements\n' },
    { name: 'Laporan-ID.md', content: '# Laporan\n\nKonten non-ASCII: sukses\n' },
  ];
  const bytes = new Uint8Array(await createZip(entries).arrayBuffer());
  const decoder = new TextDecoder();

  const eocd = bytes.length - 22;
  assert.equal(readU16(bytes, eocd + 10), entries.length);
  const cdOffset = readU32(bytes, eocd + 16);

  let p = cdOffset;
  const names: string[] = [];
  for (const entry of entries) {
    assert.equal(readU32(bytes, p), 0x02014b50);
    const nameLen = readU16(bytes, p + 28);
    const name = decoder.decode(bytes.slice(p + 46, p + 46 + nameLen));
    names.push(name);

    const localOffset = readU32(bytes, p + 42);
    assert.equal(readU32(bytes, localOffset), 0x04034b50);

    const localNameLen = readU16(bytes, localOffset + 26);
    const size = readU32(bytes, localOffset + 22);
    const dataStart = localOffset + 30 + localNameLen;
    assert.equal(size, encoder.encode(entry.content).length);
    assert.equal(decoder.decode(bytes.slice(dataStart, dataStart + size)), entry.content);

    p += 46 + nameLen;
  }
  assert.deepEqual(names, entries.map((e) => e.name));
  assert.equal(p, cdOffset + readU32(bytes, eocd + 12));
});
