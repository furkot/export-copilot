const buffer = require('./buffer');

exports = module.exports = toTrp;
exports.contentType = 'application/octet-stream';
exports.extension = 'trp';

const PASSTHROUGH = 76;

function writeEntry(out, type, name, data) {
  out.writeln('Start ', type, '=', name);
  Object.keys(data).forEach(prop => {
    let v = data[prop];
    if (v === undefined) {
      v = '';
    }
    out.writeln(prop, '=', v);
  });
  out.writeln('End ', type, '\n'); // extra empty line
}

function isValid({ coordinates }) {
  return coordinates;
}

function isStop({ nights, visit_duration, url, pin }, i, { length }) {
  if (!i || i === length - 1 || nights || visit_duration || url
    || (pin !== undefined && pin !== PASSTHROUGH)) {
    return 1;
  }
  return 0;
}

function writeTrip(out, { name, author, desc }) {
  writeEntry(out, 'Trip', name, {
    'Creator': author && [author.name, author.link].join(' '),
    'Memo': desc
  });
}

function writeStop(out, index, data) {
  const name = `Stop ${index}`;
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
  if (step.streetAddress !== undefined) {
    return step.streetAddress;
  }
  if (step.address) {
    const address = step.address.split(',')[0];
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

function writeStep(out, seq, step, i, steps) {
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
      'Show': isStop(step, i, steps),
      'Sequence': seq.index
    });
    seq.index += 1;
    return;
  }
  writeWaypoint(out, seq, step, i, steps);
}

function writeWaypoint(out, seq, wpt, i, steps) {
  const data = {
    'Longitude': formatCoord(wpt.coordinates.lon),
    'Latitude': formatCoord(wpt.coordinates.lat),
    'Show': isStop(wpt, i, steps),
    'Sequence': seq.index
  };
  writeStop(out, seq.index, data);
  seq.index += 1;
}

function writeTrp(out, opts) {
  const seq = {
    index: 0,
    opts
  };
  out.writeln('Data Version:2.14.6.1');
  writeTrip(out, opts.metadata);
  opts.routes[0].points.forEach(writeStep.bind(null, out, seq));
}

function toBuffer(str) {
  const b = new ArrayBuffer(str.length * 2 + 2);
  const dv = new DataView(b);

  // byte order
  dv.setUint8(0, 0xFF);
  dv.setUint8(1, 0xFE);
  // content

  for (let i = 0; i < str.length; i++) {
    dv.setUint16(2 + i * 2, str.charCodeAt(i), true);
  }
  return b;
}

function toTrp(opts) {
  if (opts.routes && opts.routes.length > 1) {
    return opts.routes.map(route =>
      toTrp({
        metadata: {
          name: [opts.metadata.name, route.name].join(' - '),
          author: opts.metadata.author,
          desc: opts.metadata.desc
        },
        routes: [route]
      })
    );
  }
  else {
    const buf = buffer();
    writeTrp(buf, opts);
    return toBuffer(buf.toString());
  }
}
