import * as signale from 'signale';
import { createMultiProcessPrism, CreatePrismOptions, createSingleProcessPrism } from '../../util/createServer';
import getHttpOperations from '../../util/getHttpOperations';

export const middleware = async (argv: any) => (argv.operations = await getHttpOperations(argv.document!));

export const onFail = (yargs: any, msg: string, err: { message: string }) => {
  if (msg) yargs.showHelp();
  else signale.fatal(err.message);

  process.exit(1);
};

export const documentPositional: [string, object] = [
  'document',
  {
    description: 'Path to a document. Can be both a file or a fetchable resource on the web.',
    type: 'string',
  },
];

export const handler = (isProxy: boolean, parsedArgs: any) => {
  const { multiprocess, dynamic, port, host, cors, operations } = (parsedArgs as unknown) as CreatePrismOptions & {
    multiprocess: boolean;
  };

  if (multiprocess) {
    return createMultiProcessPrism({ cors, dynamic, port, host, operations, proxy: isProxy });
  }

  return createSingleProcessPrism({ cors, dynamic, port, host, operations, proxy: isProxy });
};
