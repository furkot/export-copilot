var buffer = require('./buffer');
var poly = require('polyline-encoded');


function writeEntry(out, type, name, data) {
  out.writeln('Start ', type, '=', name);
  Object.keys(data).forEach(function(prop) {
    var v = data[prop];
    if (v === undefined) {
      v = '';
    }
    out.writeln(prop, '=', v);
  });
  out.writeln('End ', type, '\n'); // extra empty line
}

function isValid(step) {
  return step.coordinates;
}

function writeTrip(out, metadata) {
  writeEntry(out, 'Trip', metadata.name, {
    'Creator': metadata.author && [ metadata.author.name, metadata.author.link ].join(' '),
    'Memo': metadata.desc
  });
}

function writeStop(out, index, data) {
  var name = 'Stop ' + index;
  writeEntry(out, 'Stop', name, data);
  // Cost, Time. OnDuty are other options
  writeEntry(out, 'StopOpt', name, {
    'Loaded': 1
  });
}

function formatCoord(l) {
  return Math.round(l * 1e6);
}

function writeStep(out, seq, step) {
  if (!isValid(step)) {
    return;
  }
  var data = {
    'Name': step.name,
    'Address': step.address,
    'City': step.locality && step.locality.town,
    'State': step.locality && step.locality.province,
    'Country': step.locality && step.locality.country_long,
    'Longitude': formatCoord(step.coordinates.lon),
    'Latitude': formatCoord(step.coordinates.lat),
    'Show': 1,
    'Sequence': seq.index
  };
  if (seq.opts.tracks && seq.index > 0) {
    writeRoute(out, seq, step.directions.route.polyline);
  }
  writeStop(out, seq.index, data);
  seq.index += 1;
}

function writeRoute(out, seq, polyline) {
  if (!polyline) {
    return;
  }
  poly.decode(polyline).forEach(writeWaypoint.bind(null, out, seq));
}

function writeWaypoint(out, seq, wpt) {
  var data = {
    'Longitude': formatCoord(wpt[1]),
    'Latitude': formatCoord(wpt[0]),
    'Show': 0,
    'Sequence': seq.index
  };
  writeStop(out, seq.index, data);
  seq.index += 1;
}

function writeTrp(out, opts) {
  var seq = {
    index: 0,
    opts: opts
  };
  out.writeln('Data Version:2.14.6.1');
  writeTrip(out, opts.metadata);
  opts.routes[0].forEach(writeStep.bind(null, out, seq));
}

function toBuffer(str) {
  var len = Buffer.byteLength(str, 'utf16le'),
    b = new Buffer(len + 2);
  // byte order
  b.writeUInt8(0xFF, 0);
  b.writeUInt8(0xFE, 1);
  // content
  b.write(str, 2, len,  'utf16le');
  return b;
}

function toTrp(opts) {
  var buf = buffer();
  writeTrp(buf, opts);
  return toBuffer(buf.toString());
}

module.exports = toTrp;
