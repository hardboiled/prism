import { createClientFromOperations } from '../client';
import { mocker } from '../mocker';
import { IHttpConfig } from '../types';

describe('User Http Client', () => {
  describe('with mocking set to true', () => {
    describe('get a resource', () => {
      let client: ReturnType<typeof createClientFromOperations>;

      const config: IHttpConfig = {
        mock: { dynamic: false },
        validateRequest: true,
        validateResponse: true,
        securityChecks: true,
      };

      beforeAll(async () => {
        client = await createClientFromOperations(
          [
            {
              id: 'operation',
              method: 'get',
              path: '/pet',
              servers: [
                {
                  url: 'https://www.google.it',
                },
              ],
              responses: [
                {
                  code: '200',
                },
              ],
            },
          ],
          config,
        );

        jest.spyOn(mocker, 'mock');
        jest.spyOn(client, 'request');
      });

      afterEach(() => jest.clearAllMocks());

      describe('when calling with no options', () => {
        beforeAll(() => client.get('/pet'));

        test('shall call the mocker with the default options', () =>
          expect(mocker.mock).toHaveBeenCalledWith({ input: expect.anything(), resource: expect.anything(), config }));

        test('shall ultimately call the main request method with the current HTTP Method', () =>
          expect(client.request).toHaveBeenCalledWith('/pet', { method: 'get' }, undefined));
      });

      describe('when overriding a config parameter on the request level', () => {
        beforeAll(() => client.get('/pet', { securityChecks: false }));

        test('shall call the mocker with the modified options', () =>
          expect(mocker.mock).toHaveBeenCalledWith({
            input: expect.anything(),
            resource: expect.anything(),
            config: { ...config, securityChecks: false },
          }));
      });

      describe('when calling a method with overridden url', () => {
        beforeAll(() => client.get('/pet', { baseUrl: 'https://www.google.it' }));

        test('should call the mocker with the replaced full url', () => {
          expect(mocker.mock).toBeCalledWith({
            resource: expect.anything(),
            input: expect.objectContaining({
              data: expect.objectContaining({
                url: expect.objectContaining({
                  baseUrl: 'https://www.google.it',
                  path: '/pet',
                }),
              }),
            }),
            config: expect.anything(),
          });
        });
      });

      describe('when calling a method with a full url', () => {
        beforeAll(() => client.get('https://www.google.it/pet'));

        test('should call the mocker with the replaced full url', () => {
          expect(mocker.mock).toBeCalledWith({
            resource: expect.anything(),
            input: expect.objectContaining({
              data: expect.objectContaining({
                url: expect.objectContaining({
                  baseUrl: 'https://www.google.it',
                  path: '/pet',
                }),
              }),
            }),
            config: expect.anything(),
          });
        });
      });
    });
  });
});
