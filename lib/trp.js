exports = module.exports = generate;
exports.contentType = 'application/octet-stream';
exports.extension = 'trp';

const PASSTHROUGH = 76;

function* writeEntry(type, name, data) {
  yield writeln('Start ', type, '=', name);
  for (const [prop, v = ''] of Object.entries(data)) {
    yield writeln(prop, '=', v);
  }
  yield writeln('End ', type, '\n'); // extra empty line
}

function isStop({ nights, visit_duration, url, pin }) {
  return nights
    || visit_duration
    || url
    || (pin != null && pin !== PASSTHROUGH);
}

function* writeTrip({ name, author, desc }) {
  yield* writeEntry('Trip', name, {
    'Creator': author && [author.name, author.link].join(' '),
    'Memo': desc
  });
}

function* writeStop(index, data) {
  const name = `Stop ${index}`;
  yield* writeEntry('Stop', name, data);
  // Cost, Time. OnDuty are other options
  yield* writeEntry('StopOpt', name, { 'Loaded': 1 });
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

function* writeStep(seq, step, show) {
  const data = {
    'Longitude': formatCoord(step.coordinates.lon),
    'Latitude': formatCoord(step.coordinates.lat),
    'Show': show ? 1 : 0,
    'Sequence': seq.index
  };
  if (step.name || step.address || step.locality) {
    // stop
    yield* writeStop(seq.index, {
      'Name': step.name,
      'Address': streetAddress(step),
      'City': step.locality && step.locality.town,
      'State': step.locality && step.locality.province,
      'Country': step.locality && step.locality.country_long,
      ...data
    });
  } else {
    // waypoint
    yield* writeStop(seq.index, data);
  }
  seq.index += 1;
}

const BOM = Uint8Array.from([0xFF, 0xFE]);

function* generate(opts) {
  const seq = {
    index: 0
  };
  yield BOM;
  yield writeln('Data Version:2.14.6.1');
  yield* writeTrip(opts.metadata);
  const steps = opts.routes[0].points;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step.coordinates) {
      continue;
    }
    const show = seq.index === 0 || i === steps.length - 1 || isStop(step);
    yield* writeStep(seq, step, show);
  }
}

function toBuffer(str) {
  const b = new ArrayBuffer(str.length * 2);
  const dv = new DataView(b);

  for (let i = 0; i < str.length; i++) {
    dv.setUint16(i * 2, str.charCodeAt(i), true);
  }
  return b;
}

function writeln(...args) {
  const s = [...args, '\n'].join('');
  return toBuffer(s);
}
