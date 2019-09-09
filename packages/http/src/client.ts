import { IPrismOutput } from '@stoplight/prism-core';
// @ts-ignore
import logger from 'abstract-logging';
import { getOrElse } from 'fp-ts/lib/Option';
import { getStatusText } from 'http-status-codes';
import { defaults } from 'lodash';
import { parse as parseQueryString } from 'querystring';
import { parse as parseUrl } from 'url';
import { createInstance } from '.';
import { forwarder } from './forwarder';
import { getHttpOperationsFromFile } from './getHttpOperations';
import { mocker } from './mocker';
import { router } from './router';
import { IHttpConfig, IHttpRequest, IHttpResponse, IHttpUrl } from './types';
import { validator } from './validator';

const createNewClientInstance = async (defaultConfig: IHttpConfig, spec: string): Promise<PrismHttp> => {
  const obj = createInstance(defaultConfig, {
    logger,
    router,
    forwarder,
    validator,
    mocker,
  });

  const resources = await getHttpOperationsFromFile(spec);

  const request: RequestFunction = async (url, input, config) => {
    const parsedUrl = parseUrl(url);

    if (!parsedUrl.pathname) throw new Error('path name must alwasy be specified');

    const httpUrl: IHttpUrl = {
      baseUrl: parsedUrl.host ? `${parsedUrl.protocol}//${parsedUrl.host}` : undefined,
      path: parsedUrl.pathname,
      query: parseQueryString(parsedUrl.query || ''),
    };

    const data = await obj.request(
      {
        ...input,
        url: httpUrl,
      },
      resources,
      config,
    );

    const output: PrismOutput = {
      status: data.output.statusCode,
      statusText: getOrElse(() => getStatusText(data.output.statusCode))(data.output.statusText),
      headers: data.output.headers || {},
      data: data.output.body || {},
      config: defaults(config, defaultConfig),
      request: { ...input, url: httpUrl },
      validations: data.validations,
    };

    return output;
  };

  return {
    request,
    get: (url: string, input?: Pick<IHttpRequest, 'headers'> | IHttpConfig, config?: IHttpConfig) =>
      input && 'headers' in input
        ? request(url, { method: 'get', ...input }, config)
        : request(url, { method: 'get' }, config),
    put: (url: string, body: unknown, input?: Pick<IHttpRequest, 'headers'> | IHttpConfig, config?: IHttpConfig) =>
      input && 'headers' in input
        ? request(url, { method: 'put', ...input, body }, config)
        : request(url, { method: 'put', body }, config),
    post: (url: string, body: unknown, input?: Pick<IHttpRequest, 'headers'> | IHttpConfig, config?: IHttpConfig) =>
      input && 'headers' in input
        ? request(url, { method: 'post', ...input, body }, config)
        : request(url, { method: 'post', body }, config),
    delete: (url: string, input?: Pick<IHttpRequest, 'headers'> | IHttpConfig, config?: IHttpConfig) =>
      input && 'headers' in input
        ? request(url, { method: 'delete', ...input }, config)
        : request(url, { method: 'delete' }, config),
    options: (url: string, input?: Pick<IHttpRequest, 'headers'> | IHttpConfig, config?: IHttpConfig) =>
      input && 'headers' in input
        ? request(url, { method: 'options', ...input }, config)
        : request(url, { method: 'options' }, config),
    head: (url: string, input?: Pick<IHttpRequest, 'headers'> | IHttpConfig, config?: IHttpConfig) =>
      input && 'headers' in input
        ? request(url, { method: 'head', ...input }, config)
        : request(url, { method: 'head' }, config),
    patch: (url: string, body: unknown, input?: Pick<IHttpRequest, 'headers'> | IHttpConfig, config?: IHttpConfig) =>
      input && 'headers' in input
        ? request(url, { method: 'patch', ...input, body }, config)
        : request(url, { method: 'patch', body }, config),
    trace: (url: string, input?: Pick<IHttpRequest, 'headers'> | IHttpConfig, config?: IHttpConfig) =>
      input && 'headers' in input
        ? request(url, { method: 'trace', ...input }, config)
        : request(url, { method: 'trace' }, config),
  };
};

type PrismOutput = {
  status: IHttpResponse['statusCode'];
  statusText: string;
  headers: IHttpResponse['headers'];
  data: IHttpResponse['body'];
  config: IHttpConfig;
  request: IHttpRequest;
  validations: IPrismOutput<IHttpRequest, IHttpResponse>['validations'];
};

type RequestFunction = (url: string, input: Omit<IHttpRequest, 'url'>, config?: IHttpConfig) => Promise<PrismOutput>;

interface IRequestFunctionWithMethod {
  (url: string, input: Pick<IHttpRequest, 'headers'>, config?: IHttpConfig): Promise<PrismOutput>;
  (url: string, config?: IHttpConfig): Promise<PrismOutput>;
}

interface IRequestFunctionWithMethodWithBody {
  (url: string, body: unknown, input: Pick<IHttpRequest, 'headers'>, config?: IHttpConfig): Promise<PrismOutput>;
  (url: string, body: unknown, config?: IHttpConfig): Promise<PrismOutput>;
}

export type PrismHttp = {
  request: RequestFunction;
  get: IRequestFunctionWithMethod;
  put: IRequestFunctionWithMethodWithBody;
  post: IRequestFunctionWithMethodWithBody;
  delete: IRequestFunctionWithMethod;
  options: IRequestFunctionWithMethod;
  head: IRequestFunctionWithMethod;
  patch: IRequestFunctionWithMethodWithBody;
  trace: IRequestFunctionWithMethod;
};

export default createNewClientInstance;
