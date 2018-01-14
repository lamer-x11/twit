const readline = require('readline');
const { colorize, center } = require('./utils');

const color = '0;35';
const errorColor = '0;31';

function renderStream(stream, state, isActive) {
  return stream.tweets
    .filter((tweet, index) => {
      const outsideRange = index < stream.offsets[stream.page]
        || index >= stream.offsets[stream.page + 1];

      return !outsideRange;
    })
    .reduce((agg, { box }, index) => {
      if (isActive && index === state.selectedTweetIndex) {
        agg += box
          .replace(/^\||\|$/gm, colorize(color, '|'))
          .replace(/^((\.|')-.*(\.|'))$/gm, colorize(color, '$1'));
      } else {
        agg += box;
      }

      return agg;
    }, '');
}

function prepareStreamHeader(stream, size) {
  return [
    '',
    center(size, stream.name),
    center(size, `(@${stream.handle})`),
    '',
    '-'.repeat(size),
  ];
}

function clearScreen() {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}

function drawErrorMsg(msg) {
  clearScreen();
  process.stdout.write(`${colorize(errorColor, 'ERROR:')} ${msg}\n`);
}

function drawSplashMsg(msg) {
  readline.cursorTo(process.stdout, 0, Math.floor(process.stdout.rows / 2) - 1);
  process.stdout.write(center(process.stdout.columns, msg));
}

function drawStream(state, index) {
  const isActiveStream = state.selectedStreamIndex === index;
  const stream = state.streams[index];
  const streamLines = renderStream(stream, state, isActiveStream).split('\n');
  const offset = (index % state.streamsPerPage) * state.streamSizeWithPadding;

  let line = 6;

  // draw prev page indicator
  if (stream.page > 0) {
    readline.cursorTo(process.stdout, offset, line++);
    process.stdout.write(colorize(color, center(state.streamSizeWithPadding - 2, '^^^')));
  }

  // draw tweets
  for (let k = 0; k < streamLines.length; k++) {
    readline.cursorTo(process.stdout, offset, line++);
    process.stdout.write(' '.repeat(state.streamSizeWithPadding));

    readline.cursorTo(process.stdout, offset, line - 1);
    process.stdout.write(streamLines[k]);
  }

  line--;

  // draw next page indicator
  if (stream.maxPage > 0 && stream.page + 1 <= stream.maxPage) {
    readline.cursorTo(process.stdout, offset, line++);
    process.stdout.write(colorize(color, center(state.streamSizeWithPadding - 2, 'vvv')));
  }

  // clear the rest of the column
  for (; line < process.stdout.rows; line++) {
    readline.cursorTo(process.stdout, offset, line);
    process.stdout.write(' '.repeat(state.streamSizeWithPadding));
  }
}

function drawAllStreams(state) {
  clearScreen();

  const startIndex = state.streamsPerPage * state.page;
  const endIndex = (state.streamsPerPage * state.page) + state.streamsPerPage;

  for (let i = startIndex; i < endIndex; i++) {
    if (i >= state.streams.length) {
      return;
    }

    const stream = state.streams[i];
    const header = prepareStreamHeader(stream, state.streamSize + 4);

    for (let j = 0; j < header.length; j++) {
      const offset = (i % state.streamsPerPage) * state.streamSizeWithPadding;

      readline.cursorTo(process.stdout, offset, j);
      process.stdout.write(header[j]);
    }

    drawStream(state, i);
  }
}

module.exports = {
  drawStream,
  drawAllStreams,
  drawSplashMsg,
  drawErrorMsg,
  clearScreen,
};
