const $ = require('./domparser');
const { wrap, getDisplaySize, decodeHtmlEntities } = require('./utils');

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

function parseTweet(node) {
  const tweet = {
    isRetweet: false,
    retweetAuthor: '',
    isReply: false,
    recipients: [],
  };

  const textNode = $.querySelector(node, '.tweet-text');
  const dateNode = $.querySelector(node, '.timestamp');

  tweet.date = dateNode ? $.getTextContent(dateNode) : '';
  tweet.id = textNode['data-id'];
  tweet.text = $.querySelectorAll(textNode, '.twitter_external_link')
    .reduce(
      (agg, linkNode) => agg.replace($.getTextContent(linkNode), linkNode['data-url']),
      decodeHtmlEntities($.getTextContent(textNode, true)),
    );

  tweet.author = $.getTextContent($.querySelector(node, '.username'));

  const replyContext = $.querySelector(node, '.tweet-reply-context');
  const socialContext = $.querySelector(node, '.tweet-social-context');

  tweet.isReply = replyContext !== undefined;
  tweet.isRetweet = socialContext !== undefined;

  if (tweet.isReply) {
    tweet.recipients = $.querySelectorAll(replyContext, 'a').map($.getTextContent);
    tweet.contextLink = $.querySelector($.querySelector(node, '.metadata'), 'a').href;
  }

  if (tweet.isRetweet) {
    tweet.retweetAuthor = tweet.author;
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
