const { execSync } = require('child_process');
const wcwidth = require('wcwidth');

function getDisplaySize(text) {
  return text
    .split('')
    .reduce((count, char) => count + wcwidth(char), 0);
}

function wrap(text, maxLineLength) {
  const { length } = text;

  let i = 0;
  let offset = 0;
  let lineLength = 0;
  let lastSpace = 0;
  const output = [];
  const sizeMap = [];

  while (i < length) {
    sizeMap[i] = wcwidth(text[i]);

    if (text[i - 1] === ' ') {
      lastSpace = i;
    }

    if (text[i] === '\n') {
      lineLength = 0;
    } else if (lineLength >= maxLineLength) {
      let chunkSize = 0;
      for (let k = lastSpace; k <= i; k++) {
        chunkSize += sizeMap[k];
      }

      if (chunkSize < maxLineLength) {
        i = lastSpace;
      }

      output[i + offset] = '\n';
      offset++;
      lineLength = 0;
    }

    output[i + offset] = text[i];

    lineLength += sizeMap[i] > 0 ? sizeMap[i] : 1;
    ++i;
  }

  return output.join('').split('\n');
}

function colorize(code, string) {
  return `\x1b[${code}m${string}\x1b[0m`;
}

function center(width, text) {
  const padding =
    ' '.repeat(Math.floor(width / 2) - Math.ceil(getDisplaySize(text) / 2));

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
  getDisplaySize,
};
