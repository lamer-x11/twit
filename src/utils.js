const { spawnSync } = require('child_process');
const wcwidth = require('./lib/wcwidth');

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

  const result = spawnSync('curl', ['-sS', `https://mobile.twitter.com${path}`]);

  if (result.status !== 0) {
    throw new Error(result.stderr.toString());
  }

  return result.stdout.toString();
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

module.exports = {
  wrap,
  colorize,
  center,
  fetchFromTwitter,
  getDisplaySize,
  decodeHtmlEntities,
};
