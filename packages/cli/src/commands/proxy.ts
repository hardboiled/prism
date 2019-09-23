import * as signale from 'signale';
import { CommandModule } from 'yargs';
import { createMultiProcessPrism, CreatePrismOptions, createSingleProcessPrism } from '../util/createServer';
import getHttpOperations from '../util/getHttpOperations';
import options from './options';

const proxyCommand: CommandModule = {
  describe: 'Start a proxy server with the given spec file',
  command: 'proxy <upstream> <spec>',
  builder: yargs =>
    yargs
      .positional('upstream', {
        description: 'An address for the destination server.',
        type: 'string',
      })
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
      .options(options),
  handler: parsedArgs => {
    const { multiprocess, dynamic, port, host, cors, operations } = (parsedArgs as unknown) as CreatePrismOptions & {
      multiprocess: boolean;
    };

    if (multiprocess) {
      return createMultiProcessPrism({ cors, dynamic, port, host, operations, proxy: true });
    }

    return createSingleProcessPrism({ cors, dynamic, port, host, operations, proxy: true });
  },
};

export default proxyCommand;
