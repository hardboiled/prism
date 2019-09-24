import * as signale from 'signale';
import { CommandModule } from 'yargs';
import { createMultiProcessPrism, CreatePrismOptions, createSingleProcessPrism } from '../util/createServer';
import getHttpOperations from '../util/getHttpOperations';
import options from './options';

const mockCommand: CommandModule = {
  describe: 'Start a mock server with the given spec file',
  command: 'mock <spec>',
  builder: yargs =>
    yargs
      .positional('spec', {
        description: 'Path to a spec file. Can be both a file or a fetchable resource on the web.',
        type: 'string',
      })
      .middleware(async argv => (argv.operations = await getHttpOperations(argv.spec!)))
      .fail((msg, err) => {
        if (msg) yargs.showHelp();
        else signale.fatal(err.message);

        process.exit(1);
      })
      .options({
        ...options,
        dynamic: {
          alias: 'd',
          description: 'Dynamically generate examples.',
          boolean: true,
          default: false,
        },
      }),
  handler: parsedArgs => {
    const { multiprocess, dynamic, port, host, cors, operations } = (parsedArgs as unknown) as CreatePrismOptions & {
      multiprocess: boolean;
    };

    if (multiprocess) {
      return createMultiProcessPrism({ cors, dynamic, port, host, operations, proxy: false });
    }

    return createSingleProcessPrism({ cors, dynamic, port, host, operations, proxy: false });
  },
};

export default mockCommand;
