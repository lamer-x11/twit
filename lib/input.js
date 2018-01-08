const { JSDOM } = require('jsdom');
const { colorize, fetchFromTwitter } = require('./utils');
const {
  parseTweet,
  calculateOffsets,
  formatTweet,
} = require('./tweets');

function handleQuit(..._args) {
  process.exit();
}

function handleUp(state, drawStream, _drawAllStreams, _key) {
  const stream = state.streams[state.selectedStreamIndex];
  const offset = stream.offsets[stream.page];
  const prevOffset = stream.offsets[stream.page - 1];

  if (state.selectedTweetIndex - 1 < 0) {
    if (stream.page === 0) {
      return;
    }

    stream.page--;
    state.selectedTweetIndex = offset - prevOffset - 1;
  } else {
    state.selectedTweetIndex--;
  }

  drawStream(state, state.selectedStreamIndex);
}

function handleDown(state, drawStream, _drawAllStreams, _key) {
  const stream = state.streams[state.selectedStreamIndex];
  const offset = stream.offsets[stream.page];
  const nextOffset = stream.offsets[stream.page + 1];

  if (state.selectedTweetIndex + offset + 1 >= stream.tweets.length) {
    return;
  }

  state.selectedTweetIndex++;

  if (offset + state.selectedTweetIndex >= nextOffset) {
    stream.page++;
    state.selectedTweetIndex = 0;
  }

  drawStream(state, state.selectedStreamIndex);
}

function ensureIndexInRange(state) {
  const stream = state.streams[state.selectedStreamIndex];
  const offset = stream.offsets[stream.page];
  const nextOffset =
    stream.offsets[stream.page + 1] || stream.tweets.length;
  const visibleTweets = nextOffset - offset - 1;

  if (state.selectedTweetIndex > visibleTweets) {
    state.selectedTweetIndex = visibleTweets;
  }
}

function handleRight(state, drawStream, drawAllStreams, _key) {
  if (state.selectedStreamIndex + 1 < state.streams.length) {
    state.selectedStreamIndex++;

    ensureIndexInRange(state);

    const newPage =
      Math.floor(state.selectedStreamIndex / state.streamsPerPage);

    if (newPage !== state.page) {
      state.page = newPage;

      drawAllStreams(state);

      return;
    }

    drawStream(state, state.selectedStreamIndex - 1);
    drawStream(state, state.selectedStreamIndex);
  }
}

function handleLeft(state, drawStream, drawAllStreams, _key) {
  if (state.selectedStreamIndex - 1 >= 0) {
    state.selectedStreamIndex--;

    ensureIndexInRange(state);

    const newPage =
      Math.floor(state.selectedStreamIndex / state.streamsPerPage);

    if (newPage !== state.page) {
      state.page = newPage;

      drawAllStreams(state);

      return;
    }

    drawStream(state, state.selectedStreamIndex + 1);
    drawStream(state, state.selectedStreamIndex);
  }
}

function handlePageUp(state, drawStream, _drawAllStreams, _key) {
  const stream = state.streams[state.selectedStreamIndex];

  if (stream.page === 0) {
    return;
  }

  state.selectedTweetIndex = 0;
  stream.page--;

  drawStream(state, state.selectedStreamIndex);
}

function handlePageDown(state, drawStream, _drawAllStreams, _key) {
  const stream = state.streams[state.selectedStreamIndex];

  if (stream.page + 1 > stream.maxPage) {
    return;
  }

  state.selectedTweetIndex = 0;
  stream.page++;

  drawStream(state, state.selectedStreamIndex);
}

function addContextMessage(state, message) {
  const stream = state.streams[state.selectedStreamIndex];
  const absIndex = stream.offsets[stream.page] + state.selectedTweetIndex;
  const tweet = stream.tweets[absIndex];

  tweet.box += colorize('2;49', message);

  stream.offsets = calculateOffsets(stream.tweets, process.stdout.rows);
  stream.maxPage = stream.offsets.length - 1;

  if (absIndex >= stream.offsets[stream.page + 1]) {
    stream.page++;
    state.selectedTweetIndex = 0;
  }

  return state;
}

function handleContextRequest(state, drawStream, _drawAllStreams, _key) {
  const stream = state.streams[state.selectedStreamIndex];
  const absIndex = stream.offsets[stream.page] + state.selectedTweetIndex;
  const tweet = stream.tweets[absIndex];

  if (!tweet.isReply || tweet.hasContext) {
    return;
  }

  let contextTweet;

  if (tweet.contextId !== undefined) {
    contextTweet = Object.assign({}, state.cache[tweet.contextId]);
  } else {
    drawStream(
      addContextMessage(state, " | \n '- Fetching context...\n\n"),
      state.selectedStreamIndex,
    );

    const contextHtml = fetchFromTwitter(tweet.contextLink);

    const dom = new JSDOM(contextHtml);
    const $ = dom.window.document;

    const nodes = Object.values($.querySelectorAll('.tweet, .main-tweet'));

    const ids = nodes.map(node => node
      .getElementsByClassName('tweet-text')[0]
      .dataset
      .id);

    const contextTweets = nodes
      .map((node, index) => {
        const newTweet = state.cache[ids[index]] !== undefined
          ? state.cache[ids[index]]
          : parseTweet(node);

        if (index > 0) {
          newTweet.contextId = ids[index - 1];
        }

        return newTweet;
      });

    contextTweets.forEach((ctxTweet) => {
      state.cache[ctxTweet.id] = ctxTweet;
    });

    const pos = ids.indexOf(tweet.id) - 1;

    if (pos < 0) {
      tweet.hasContext = true;
      tweet.box = formatTweet(tweet, state.streamSize);

      drawStream(
        addContextMessage(state, " | \n '- No context found.\n\n"),
        state.selectedStreamIndex,
      );

      return;
    }

    contextTweet = Object.assign({}, contextTweets[pos]);
  }

  contextTweet.isContext = true;
  contextTweet.box = formatTweet(contextTweet, state.streamSize - 4, true);

  tweet.hasContext = true;
  tweet.box = formatTweet(tweet, state.streamSize);

  drawStream(
    addContextMessage(state, contextTweet.box),
    state.selectedStreamIndex,
  );
}

function withCtrl(handler) {
  return (state, drawStream, drawAllStreams, key) => {
    if (key.ctrl) {
      handler(state, drawStream, drawAllStreams, key);
    }
  };
}

const handlers = {};

handlers.q = handleQuit;

handlers.left = handleLeft;
handlers.down = handleDown;
handlers.up = handleUp;
handlers.right = handleRight;
handlers.pageup = handlePageUp;
handlers.pagedown = handlePageDown;
handlers.return = handleContextRequest;

handlers.h = handleLeft;
handlers.j = handleDown;
handlers.k = handleUp;
handlers.l = handleRight;
handlers.u = withCtrl(handlePageUp);
handlers.d = withCtrl(handlePageDown);
handlers.o = handleContextRequest;

function handleInput(state, drawStream, drawAllStreams, key) {
  const handler = handlers[key.name];

  if (handler !== undefined) {
    handler(state, drawStream, drawAllStreams, key);
  }
}

module.exports = {
  handleInput,
};
