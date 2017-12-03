# Twit

A simple tool for passive reading multiple Twitter streams in the terminal.

## Features and limitations

I don't have a Twitter account but there are some profiles that I like to check up on regularly. What I don't like is getting sucked into an endless vortex of links and n-level deep discussions far removed from the original message that eat away my time and attention. This tool aims to combat this by making the  _reading_ part of my daily Twitter rountine easier and intentionally introducing friction everywhere else to disrupt the habit of immediately clicking on things.

Twit will read a list of profile names from `profiles.txt`, fetch the contents of their respective pages (using `curl`) and render them all together in a convenient format. No additional tweets can be loaded at this point with the exception of those providing context to replies (see example). The default shortened links are replaced with original urls which makes them un-clickable in most cases. Again, this is considered a feature. If something is not worth copying and pasting into the browser in multiple chunks then it shouldn't be clicked in the first place.

The retrieval of data is a synchronous operation because I want to have a loading time penalty for every additional person followed. It encourages pruning the reading list, taking planned breaks and discourages reading tweets between other tasks.

## Installation

on desktop:

```bash
$ npm install

```
with Docker:

```bash
$ docker build -t twit .
$ docker run -ti -v $(pwd):/workdir twit npm install
```

## Usage

Populate `profiles.txt` with a list of profiles to follow. Empty lines and lines starting with `#` will be ignored.

Afterwards run:

```bash
$ node twit.js
```
or if you're using Docker:

```bash
$ docker run -ti -v $(pwd):/workdir twit
```

### Keyboard controls

- movement: `hjkl` or `Arrow keys`
- show context for reply: `o` or `Enter`
- page up: `^U` or `PgUp`
- page down: `^D` or `PgDn`
- exit: `q`

## Example

[Example](https://github.com/lamer-x11/twit/raw/master/example.gif "Example")
