const { JSDOM } = require('jsdom');
const { wrap, getDisplaySize } = require('./utils');

function renderRegularBox(content, width) {
  let box = content.reduce((agg, line) => {
    agg += `| ${line}${' '.repeat((width - getDisplaySize(line)) + 1)}|\n`;

    return agg;
  }, `.${'-'.repeat(width + 2)}.\n`);

  box += `|${' '.repeat(width + 2)}|\n`;
  box += `'${'-'.repeat(width + 2)}'\n`;

  return box;
}

function renderContextBox(content, width) {
  let box = content.reduce((agg, line, index) => {
    const side = index === 0 ? " '-| " : '   | ';

    agg += `${side}${line}${' '.repeat((width - getDisplaySize(line)) + 1)}| \n`;

    return agg;
  }, ` | .${'-'.repeat(width + 2)}. \n`);

  box += `   |${' '.repeat(width + 2)}| \n`;
  box += `   '${'-'.repeat(width + 2)}' \n`;

  return box;
}

function formatTweet(tweet, width, isContext = false) {
  const content = [
    tweet.date,
    '----------',
  ];

  if (isContext) {
    content.push(`Author: ${tweet.author}`);
  }

  if (tweet.isRetweet) {
    content.push(`RT from: ${tweet.retweetAuthor}`);
  }

  if (tweet.isReply) {
    content.push(`Reply to: ${tweet.recipients.join(' ')}`);
  }

  content.push('');
  content.push(tweet.text);

  const wrappedText =
    content.reduce((agg, line) => agg.concat(wrap(line, width)), []);

  const render = isContext ? renderContextBox : renderRegularBox;

  return render(wrappedText, width);
}

function parseTweet(tweetNode) {
  const tweet = {
    isRetweet: false,
    retweetAuthor: '',
    isReply: false,
    recipients: [],
  };

  const div = (new JSDOM()).window.document.createElement('div');
  div.appendChild(tweetNode);

  const textNode = div.querySelector('.tweet-text');
  const dateNode = div.querySelector('.timestamp');

  tweet.date = dateNode ? dateNode.textContent.trim() : '';
  tweet.id = textNode.dataset.id;
  tweet.text = Object
    .values(div.querySelectorAll('.tweet-text .twitter_external_link'))
    .reduce(
      (agg, node) => agg.replace(node.textContent, node.dataset.url),
      textNode.textContent.trim(),
    );

  tweet.author = div.querySelector('.username').textContent.trim();

  const replyContext = div.querySelector('.tweet-reply-context');
  const socialContext = div.querySelector('.tweet-social-context');

  tweet.isReply = replyContext !== null;
  tweet.isRetweet = socialContext !== null;

  if (tweet.isReply) {
    tweet.recipients = Object.values(replyContext.querySelectorAll('a'))
      .map(a => a.textContent.trim().replace('\n', '').replace(/ +/, ' '));

    tweet.contextLink = div.querySelector('.metadata a').href;
  }

  if (tweet.isRetweet) {
    tweet.retweetAuthor = div.querySelector('.username').textContent.trim();
  }

  return tweet;
}

function calculateOffsets(tweets, termRows, topOffset = 8) {
  let size = topOffset;

  return tweets.reduce((agg, tweet, index) => {
    const boxHeight = tweet.box.match(/\n/g).length;

    if (boxHeight + size >= termRows) {
      agg.push(index);
      size = topOffset;
    }

    size += boxHeight;

    return agg;
  }, [0]);
}

module.exports = {
  parseTweet,
  calculateOffsets,
  formatTweet,
};
