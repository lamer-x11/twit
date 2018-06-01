// This is a really, really bad parser. It makes a TON of assumptions, skips most
// of the data and whenever there was a choice between correctness and shoving an
// extra "if" statement somewhere to solve a problem the latter won almost every time.
//
// The entire file provides the absolute minimum functionality needed to a) extract
// some text from a couple of tweets, b) become a lightweight replacement for a third
// party library that was previously used for this task and c) avoid having to download
// 245 dependencies to make the application usable.
//
// While it gets the job done but I wouldn't recomment it to anyone. You've been warned...

function newNode(type) {
  return {
    type,
    id: '',
    class: [],
    href: '',
    children: [],
  };
}

function newTextNode() {
  return {
    type: 'text',
    text: '',
    children: [],
  };
}

function InputStream(data) {
  let position = 0;

  const stream = {
    peek: () => data.charAt(position),
    eof: () => stream.peek() === '',
    next: () => data.charAt(position++),
  };

  return stream;
}

const validTags = [
  'html', 'head', 'title', 'body', 'div', 'span', 'a',
  'table', 'tbody', 'thead', 'tr', 'td', 'strong', 'em',
];

const validProperties = [
  'id', 'class', 'href', 'data-id', 'data-url',
];

// parsing

function parse(stream, root) {
  while (!stream.eof()) {
    const char = stream.next();

    if (char === '<') {
      const node = readHTMLTag(stream);

      if (node.type === 'invalid') {
        root.children.push(node);
        continue;
      }

      if (node.type.substr(1) === root.type) {
        return root;
      }

      if (validTags.indexOf(node.type) === -1) {
        continue;
      }

      if (node.type[0] === '/') {
        return parse(stream, root);
      }

      // @Lazyness: text starting with '>' will get clipped
      if (stream.peek() === '>') {
        continue;
      }

      // skip leading whitespace
      skipWhitespace(stream);

      const textNode = readText(stream);

      if (textNode.text !== '') {
        node.children.push(textNode);
      }

      root.children.push(parse(stream, node));
    } else {
      const textNode = readText(stream);

      if (textNode.text !== '') {
        root.children.push(textNode);
      }
    }
  }

  return root;
}

function readText(stream) {
  const textNode = newTextNode();

  while (stream.peek() !== '<' && !stream.eof()) {
    let char = stream.next();

    if (char === ' ' || char === '\n') {
      if (stream.peek() === ' ' || stream.peek() === '\n') {
        skipWhitespace(stream);
      }

      if (char === '\n' && stream.peek() === '<') {
        break;
      }

      char = ' ';
    }

    textNode.text += char;
  }

  return textNode;
}

function readHTMLTag(stream) {
  let node = newNode();

  let type = '';
  while (stream.peek() !== ' ' && stream.peek() !== '>') {
    type += stream.next();
  }

  node.type = type;

  if (validTags.indexOf(type) === -1 && validTags.indexOf(type.substring(1)) === -1) {
    node = readText(stream);
    node.type = 'invalid';
    node.text = '<' + type + node.text;

    return node;
  }

  if (stream.peek() === '>') {
    return node;
  }

  let property = undefined;
  let value = '';
  while (stream.peek() !== '>') {
    let char = stream.next();

    if (char === '=') {
      if (validProperties.indexOf(value) === -1) {
        char = stream.next(); // skip =
        char = stream.next(); // skip "
        while (char !== '"' && char !== '>') {
          char = stream.next();
        }

        if (char === '>') {
          break;
        }

        value = '';
        continue;
      }

      property = value;
      value = '';

      char = stream.next();
      while ((char = stream.next()) !== '"' && stream.peek() !== '>') {
        value += char;
      }

      node[property] = value;
      value = '';
    } else if (char !== ' ') {
      value += char;
    }
  }

  if (typeof node.class === 'string') {
    node.class = node.class.split(' ');
  }

  if (stream.peek() === '>') {
    stream.next();
  }

  return node;
}

function skipWhitespace(stream) {
  while ((stream.peek() === ' ' || stream.peek() === '\n') && !stream.eof()) {
    stream.next();
  }
}

// data access

function getTextContent(node, includeSkippedHTML = false) {
  let text = '';

  const childrenLength = node.children.length;

  for (let i = 0; i < childrenLength; i++) {
    if (node.children[i].type === 'text' || (includeSkippedHTML && node.children[i].type === 'invalid')) {
      text += node.children[i].text;
    } else {
      text += getTextContent(node.children[i], includeSkippedHTML);
    }
  }

  return text;
}

function getSelectorType(selector) {
  if (selector[0] === '.') {
    return ['class', selector.substring(1)];
  }
  if (selector[0] === '#') {
    return ['id', selector.substring(1)];
  }

  return ['type', selector];
}

function querySelectorAll(root, rawSelector, result = []) {
  const selectors = rawSelector.split('|');

  for (let s = 0; s < selectors.length; s++) {
    const [property, selector] = getSelectorType(selectors[s]);

    if ([].concat(root[property]).indexOf(selector) > -1) {
      result.push(root);
    }
  }

  if (!root.children) {
    return result;
  }

  const childrenLength = root.children.length;

  for (let i = 0; i < childrenLength; i++) {
    querySelectorAll(root.children[i], rawSelector, result);
  }

  return result;
}

function querySelector(root, rawSelector) {
  const [property, selector] = getSelectorType(rawSelector);

  if ([].concat(root[property]).indexOf(selector) > -1) {
    return root;
  }

  const childrenLength = root.children.length;
  for (let i = 0; i < childrenLength; i++) {
    const node = querySelector(root.children[i], rawSelector);

    if (node !== undefined) {
      return node;
    }
  }

  return undefined;
}

module.exports = {
  parse: (data) => {
    const fakeRoot = {
      type: 'root',
      id: '',
      class: [],
      href: '',
      children: [],
    };

    return parse(InputStream(data), fakeRoot);
  },
  getTextContent,
  querySelectorAll,
  querySelector,
};
