const { execSync } = require('child_process');

function wrap(text, maxLineLength) {
  const { length } = text;

  if (length < maxLineLength) {
    return text;
  }

  let i = 0;
  let offset = 0;
  let lineLength = 0;
  let lastSpace;
  const output = [];

  while (i < length) {
    if (text[i - 1] === ' ') {
      lastSpace = i;
    }

    if (text[i] === '\n') {
      lineLength = 0;
    } else if (lineLength >= maxLineLength) {
      if (i - lastSpace < maxLineLength) {
        i = lastSpace;
      }

      output[i + offset] = '\n';
      offset++;
      lineLength = 0;
    }

    output[i + offset] = text[i];

    ++i;
    ++lineLength;
  }

  return output.join('').split('\n');
}

function colorize(code, string) {
  return `\x1b[${code}m${string}\x1b[0m`;
}

function center(width, text) {
  const padding =
    ' '.repeat(Math.floor(width / 2) - Math.ceil(text.length / 2));

  return padding + text + padding;
}

function fetchFromTwitter(path) {
  if (path[0] !== '/') {
    path = `/${path}`;
  }

  return execSync(`curl -s https://mobile.twitter.com${path}`).toString('utf8');
}

module.exports = {
  wrap,
  colorize,
  center,
  fetchFromTwitter,
};
