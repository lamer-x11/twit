FROM mhart/alpine-node:9

RUN apk update && apk add curl
RUN adduser -D -u 1000 dev

USER dev

WORKDIR /workdir

CMD ["./twit.js"]
