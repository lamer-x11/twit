#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const { JSDOM } = require('jsdom');
const { handleInput } = require('./lib/input');
const { fetchFromTwitter } = require('./lib/utils');
const {
  formatTweet,
  parseTweet,
  calculateOffsets,
} = require('./lib/tweets');
const {
  drawAllStreams,
  drawStream,
  drawSplashMsg,
  drawErrorMsg,
} = require('./lib/display');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

// clear screen
process.stdout.write('\x1Bc');

const sourceFile = './profiles.txt';

if (!fs.existsSync(sourceFile)) {
  drawErrorMsg(`Source file (${sourceFile}) not found`);

  process.exit();
}

const sources = fs.readFileSync(sourceFile, 'utf8')
  .split('\n')
  .filter(line => line !== '' && line[0] !== '#');

const totalSources = sources.length;

if (totalSources === 0) {
  drawErrorMsg('The profiles list is empty. Nothing to do...');

  process.exit();
}

const state = {};

state.cache = {};
state.streamSize = 38;
state.streamSizeWithPadding = state.streamSize + 8;
state.selectedTweetIndex = 0;
state.selectedStreamIndex = 0;
state.page = 0;
state.streamsPerPage =
  Math.floor(process.stdout.columns / state.streamSizeWithPadding);
state.streams = sources
  .map((name, index) => {
    drawSplashMsg(`Fetching stream ${index + 1} of ${totalSources}`);

    return fetchFromTwitter(name);
  })
  .map((html, index) => {
    drawSplashMsg(`Processing stream ${index + 1} of ${totalSources}`);

    const dom = new JSDOM(html);
    const $ = dom.window.document;

    const name = $.querySelector('.fullname');

    if (name === null) {
      const profile = sources[index];

      drawErrorMsg(`Unprocessable data received for profile @${profile}`);

      process.exit();
    }

    const stream = {};

    stream.name = name.textContent.trim();
    stream.handle = $.querySelector('.screen-name').textContent.trim();
    stream.tweets = Object
      .values($.querySelectorAll('.tweet'))
      .map(parseTweet)
      .map((tweet) => {
        tweet.box = formatTweet(tweet, state.streamSize);

        return tweet;
      });

    stream.tweets.forEach((tweet) => {
      state.cache[tweet.id] = tweet;
    });

    stream.page = 0;
    stream.offsets = calculateOffsets(stream.tweets, process.stdout.rows);
    stream.maxPage = stream.offsets.length - 1;

    return stream;
  });

process.stdout.on('resize', () => {
  state.streamsPerPage =
    Math.floor(process.stdout.columns / state.streamSizeWithPadding);
  state.page = Math.floor(state.selectedStreamIndex / state.streamsPerPage);

  const currentStream = state.streams[state.selectedStreamIndex];
  const absIndex =
    currentStream.offsets[currentStream.page] + state.selectedTweetIndex;

  state.streams.forEach((stream, index) => {
    stream.offsets = calculateOffsets(stream.tweets, process.stdout.rows);
    stream.maxPage = stream.offsets.length - 1;

    // ensure the selected tweet stays in view
    if (index === state.selectedStreamIndex) {
      [state.selectedTweetIndex, stream.page] =
        stream.offsets.reduce(
          (agg, offset, page) =>
            (offset <= absIndex ? [absIndex - offset, page] : agg),
          [0, 0],
        );

      return;
    }

    stream.page = 0;
  });

  drawAllStreams(state);
});

process.stdin.on(
  'keypress',
  (str, key) => handleInput(state, drawStream, drawAllStreams, key),
);

drawAllStreams(state);
