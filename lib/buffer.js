/**
 * Simple string buffer.
 */
function buffer() {
  const my = {
    strs: []
  };

  const self = {
    toString() {
      return my.strs.join('');
    },

    write(...args) {
      my.strs.push(args.join(''));
      return self;
    },

    writeln(...args) {
      my.strs.push(args.join('') + '\n');
      return self;
    }
  };

  return self;
}

module.exports = buffer;
