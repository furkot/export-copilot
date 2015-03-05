var trp = require('../lib/trp');
var fs = require('fs');
var path = require('path');

/*global describe, it*/

function loadFile(dirname, file) {
  var filename = path.resolve(dirname, file);
  return fs.readFileSync(filename);
}

function loadJson(dirname, file) {
  return JSON.parse(loadFile(dirname, file));
}

describe('copilot trp', function () {
  it('simple trip', function (done) {
    var t = loadJson(__dirname, './fixtures/simple-trip.json'),
      generated = trp(t),
      expected = loadFile(__dirname, './fixtures/simple.trp');

    // require('fs').writeFileSync('simple.trp', generated);

    generated.should.eql(expected);
    done();
  });

  it('multi trip', function (done) {
    var t = loadJson(__dirname, './fixtures/multi-trip.json'),
      generated = trp(t),
      expected = loadFile(__dirname, './fixtures/multi.trp');

    // require('fs').writeFileSync('multi.trp', generated);

    generated.should.eql(expected);
    done();
  });

  it('pass thru', function (done) {
    var t = loadJson(__dirname, './fixtures/pass-thru.json'),
      generated = trp(t),
      expected = loadFile(__dirname, './fixtures/pass-thru.trp');

    // require('fs').writeFileSync('pass-thru.trp', generated);

    generated.should.eql(expected);
    done();
  });

  it('day routes', function (done) {
    var t = loadJson(__dirname, './fixtures/day-routes.json'),
      generated = trp(t);

    generated.forEach(function (generated, i) {
      var expected = loadFile(__dirname, './fixtures/day-routes/day-' + (i + 1) + '.trp');
      
      // require('fs').writeFileSync('day-' + (i + 1) + '.trp', generated);

      generated.should.eql(expected);
    });

    done();
  });
});