# docker build -t wolweb .
FROM golang:1.20-alpine AS builder

LABEL org.label-schema.vcs-url="https://github.com/sameerdhoot/wolweb" \
    org.label-schema.url="https://github.com/sameerdhoot/wolweb/blob/master/README.md"

RUN mkdir /wolweb
WORKDIR /wolweb

# Install Dependecies
RUN apk update && apk upgrade && \
    apk add --no-cache git && \
    git clone https://github.com/sameerdhoot/wolweb . && \
    go mod tidy && \
    go mod download

# Build Source Files
RUN go build -o wolweb . 

# Create 2nd Stage final image
FROM alpine
WORKDIR /wolweb
COPY --from=builder /wolweb/index.html .
COPY --from=builder /wolweb/wolweb .
COPY --from=builder /wolweb/devices.json .
COPY --from=builder /wolweb/config.json .
COPY --from=builder /wolweb/static ./static

RUN apk add --no-cache curl

ARG WOLWEBPORT=8089
ENV WOLWEBPORT=${WOLWEBPORT}
ARG WOLWEBVDIR = /wolweb
ENV WOLWEBVDIR=${WOLWEBVDIR}

CMD ["/wolweb/wolweb"]

EXPOSE ${WOLWEBPORT}
HEALTHCHECK --interval=5s --timeout=3s \
    CMD curl --silent --show-error --fail http://localhost:${WOLWEBPORT}${WOLWEBVDIR}/health || exit 1
