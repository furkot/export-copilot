var buffer = require('./buffer');

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

function streetAddress(step) {
  var address;
  if (step.streetAddress !== undefined) {
    return step.streetAddress;
  }
  if (step.address) {
    address = step.address.split(',')[0];
    if (!step.locality || address !== step.locality.town
        && address !== step.locality.province && address !== step.locality.province_long
        && address !== step.locality.country && address !== step.locality.country_long) {
      step.streetAddress = address;
      return address;
    }
    step.streetAddress = '';
    return '';
  }
}

function writeStep(out, seq, step) {
  if (!isValid(step)) {
    return;
  }
  if (step.name || step.address || step.locality) {
    writeStop(out, seq.index, {
      'Name': step.name,
      'Address': streetAddress(step),
      'City': step.locality && step.locality.town,
      'State': step.locality && step.locality.province,
      'Country': step.locality && step.locality.country_long,
      'Longitude': formatCoord(step.coordinates.lon),
      'Latitude': formatCoord(step.coordinates.lat),
      'Show': 1,
      'Sequence': seq.index
    });
    seq.index += 1;
    return;
  }
  writeWaypoint(out, seq, step);
}

function writeWaypoint(out, seq, wpt) {
  var data = {
    'Longitude': formatCoord(wpt.coordinates.lon),
    'Latitude': formatCoord(wpt.coordinates.lat),
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
  opts.routes[0].points.forEach(writeStep.bind(null, out, seq));
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
  var buf;
  if (opts.routes && opts.routes.length > 1) {
    return opts.routes.map(function (route) {
      return toTrp({
        metadata: {
          name: [ opts.metadata.name, route.name ].join(' - '),
          author: opts.metadata.author,
          desc: opts.metadata.desc
        },
        routes: [ route ]
      });
    });
  }
  else {
    buf = buffer();
    writeTrp(buf, opts);
    return toBuffer(buf.toString());
  }
}

module.exports = toTrp;
