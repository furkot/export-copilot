const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const trp = require('../lib/trp');

test('simple trip', () => {
  const json = loadJson('./fixtures/simple-trip.json');
  const generated = trp(json);
  const expected = loadFile('./fixtures/simple.trp');

  // require('fs').writeFileSync('simple.trp', generated);

  compare(generated, expected);
});

test('multi trip', () => {
  const json = loadJson('./fixtures/multi-trip.json');
  const generated = trp(json);
  const expected = loadFile('./fixtures/multi.trp');

  // require('fs').writeFileSync('multi.trp', generated);

  compare(generated, expected);
});

test('pass thru', () => {
  const json = loadJson('./fixtures/pass-thru.json');
  const generated = trp(json);
  const expected = loadFile('./fixtures/pass-thru.trp');

  // require('fs').writeFileSync('pass-thru.trp', generated);

  compare(generated, expected);
});

test('day routes', () => {
  const json = loadJson('./fixtures/day-routes.json');

  json.routes.forEach((route, i) => {
    const opts = {
      metadata: {
        name: [json.metadata.name, route.name].join(' - '),
        author: json.metadata.author,
        desc: json.metadata.desc
      },
      routes: [route]
    };

    const generated = trp(opts);
    const expected = loadFile('./fixtures/day-routes/day-' + (i + 1) + '.trp');

    // require('fs').writeFileSync('day-' + (i + 1) + '.trp', generated);

    compare(generated, expected);
  });
});

function loadFile(file) {
  const filename = path.resolve(__dirname, file);
  return fs.readFileSync(filename);
}

function loadJson(file) {
  return JSON.parse(loadFile(file));
}

function concat(buffers) {
  let result = new Uint8Array(0);
  for (const buffer of buffers) {
    const b = new Uint8Array(buffer);
    const len = result.length + b.length;
    const r = new Uint8Array(len);
    r.set(result, 0);
    r.set(b, result.length);
    result = r;
  }
  return result;
}

function compare(generated, expected) {
  const actual = concat(generated);
  for (let i = 0; i < actual.length; i += 1) {
    assert.equal(actual[i], expected.readUInt8(i), `byte at ${i}`);
  }
  assert.equal(actual.length, expected.length);
}
