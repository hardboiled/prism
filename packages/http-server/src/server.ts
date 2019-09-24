import { createLogger } from '@stoplight/prism-core';
import { createInstance, IHttpConfig, IHttpMethod, PrismHttpInstance, ProblemJsonError } from '@stoplight/prism-http';
import { IHttpOperation } from '@stoplight/types';
import * as fastify from 'fastify';
import * as fastifyCors from 'fastify-cors';
import * as formbodyParser from 'fastify-formbody';
import * as proxy from 'fastify-http-proxy';
import { IncomingMessage, ServerResponse } from 'http';
import { defaults } from 'lodash';
import * as typeIs from 'type-is';
import { getHttpConfigFromRequest } from './getHttpConfigFromRequest';
import { serialize } from './serialize';
import { IPrismHttpServer, IPrismHttpServerOpts } from './types';

function validateAndLog(abc: any) {
  // for the validation will need to find it in the spec: https://github.com/stoplightio/prism/blob/63d9aa7a9acf27ad455a462c7d699f512503e0dc/packages/core/src/factory.ts#L21

  console.log('validating', typeof abc);
  console.log('no errors');
  console.log('1 warning found');
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

export const createServer = (operations: IHttpOperation[], opts: IPrismHttpServerOpts): IPrismHttpServer => {
  const { components, config } = opts;

  const server = opts.config.proxy
    ? fastify().register(proxy, {
        upstream: 'http://localhost:9999', // TODO: take the value from `upstream`
        http2: false,
        preHandler(request: any, reply: any, done: any) {
          validateAndLog(request);

          done();
        },
        replyOptions: {
          onResponse(request: any, reply: any, stream: any) {
            readStream(stream).then(validateAndLog);

            reply.send(stream);
          },
        },
      })
    : fastify({
        logger: (components && components.logger) || createLogger('HTTP SERVER'),
        disableRequestLogging: true,
        modifyCoreObjects: false,
      }).register(formbodyParser);

  if (opts.cors) server.register(fastifyCors);

  server.addContentTypeParser('*', { parseAs: 'string' }, (req, body, done) => {
    if (typeIs(req, ['application/*+json'])) {
      try {
        return done(null, JSON.parse(body));
      } catch (e) {
        return done(e);
      }
    }
    const error: Error & { status?: number } = new Error(`Unsupported media type.`);
    error.status = 415;
    Error.captureStackTrace(error);
    return done(error);
  });

  const mergedConfig = defaults<Partial<IHttpConfig>, IHttpConfig>(config, {
    mock: { dynamic: false },
    validateRequest: true,
    validateResponse: true,
    proxy: opts.config.proxy,
  });

  const prism = createInstance(mergedConfig, components);

  opts.cors
    ? server.route({
        url: '*',
        method: ['GET', 'DELETE', 'HEAD', 'PATCH', 'POST', 'PUT'],
        handler: replyHandler(prism),
      })
    : server.all('*', replyHandler(prism));

  const prismServer: IPrismHttpServer = {
    get prism() {
      return prism;
    },

    get fastify() {
      return server;
    },

    listen: (port: number, ...args: any[]) => server.listen(port, ...args),
  };

  function replyHandler(prismInstance: PrismHttpInstance): fastify.RequestHandler<IncomingMessage, ServerResponse> {
    return async (request, reply) => {
      const {
        req: { method, url },
        body,
        headers,
        query,
      } = request;

      const input = {
        method: (method ? method.toLowerCase() : 'get') as IHttpMethod,
        url: {
          path: (url || '/').split('?')[0],
          query,
          baseUrl: query.__server,
        },
        headers,
        body,
      };

      request.log.info({ input }, 'Request received');
      try {
        const operationSpecificConfig = getHttpConfigFromRequest(input);
        const mockConfig = Object.assign({}, opts.config.mock, operationSpecificConfig);

        const response = await prismInstance.process(input, operations, {
          ...opts.config,
          mock: mockConfig,
        });

        const { output } = response;

        if (output) {
          reply.code(output.statusCode);

          if (output.headers) {
            reply.headers(output.headers);
          }

          reply.serializer((payload: unknown) => serialize(payload, reply.getHeader('content-type'))).send(output.body);
        } else {
          throw new Error('Unable to find any decent response for the current request.');
        }
      } catch (e) {
        if (!reply.sent) {
          const status = 'status' in e ? e.status : 500;
          reply
            .type('application/problem+json')
            .serializer(JSON.stringify)
            .code(status);

          if (e.additional && e.additional.headers) {
            reply.headers(e.additional.headers);
          }

          reply.send(ProblemJsonError.fromPlainError(e));
        } else {
          reply.res.end();
        }

        request.log.error({ input, offset: 1 }, `Request terminated with error: ${e}`);
      }
    };
  }

  return prismServer;
};
