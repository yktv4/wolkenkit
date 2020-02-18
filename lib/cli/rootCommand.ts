import { Command } from 'command-line-interface';
import { initCommand } from './init/initCommand';
import { RootOptions } from './RootOptions';

const rootCommand = function (): Command<RootOptions> {
  return {
    name: 'wolkenkit',
    description: 'Manages wolkenkit.',

    optionDefinitions: [
      {
        name: 'verbose',
        alias: 'v',
        description: 'enable verbose mode',
        type: 'boolean',
        isRequired: false,
        defaultValue: false
      }
    ],

    handle ({ getUsage }): void {
      /* eslint-disable no-console */
      console.log(getUsage({ commandPath: [ 'wolkenkit' ]}));
      /* eslint-enable no-console */
    },

    subcommands: {
      init: initCommand()
    }
  };
};

export { rootCommand };