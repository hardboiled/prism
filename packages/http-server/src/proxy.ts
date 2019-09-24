import { FastifyReply, FastifyRequest, Plugin } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';

import * as proxy from 'fastify-http-proxy';

type FastifyProxyOptions = any;

function validateRequest(x: any) {
  return x;
}

function validateResponse(x: any) {
  return x;
}

function readStream(stream: NodeJS.ReadStream, encoding = 'utf8') {
  stream.setEncoding(encoding);

  return new Promise((resolve, reject) => {
    let data = '';

    stream.on('data', chunk => (data += chunk));
    stream.on('end', () => resolve(data));
    stream.on('error', error => reject(error));
  });
}

export const getProxy = (
  upstream: string,
): [Plugin<Server, IncomingMessage, ServerResponse, FastifyProxyOptions>, FastifyProxyOptions] => [
  proxy,
  {
    upstream,
    preHandler(
      request: FastifyRequest<IncomingMessage | Http2ServerRequest>,
      reply: FastifyReply<ServerResponse | Http2ServerResponse>,
      done: Function,
    ) {
      validateRequest(request);

      done();
    },
    replyOptions: {
      onResponse(
        request: FastifyRequest<IncomingMessage | Http2ServerRequest>,
        reply: FastifyReply<ServerResponse | Http2ServerResponse>,
        stream: NodeJS.ReadStream,
      ) {
        readStream(stream).then(validateResponse);

        reply.send(stream);
      },
    },
  },
];
