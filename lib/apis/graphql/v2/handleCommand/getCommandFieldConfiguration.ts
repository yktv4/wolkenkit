import { addMissingPrototype } from '../../../../common/utils/graphql/addMissingPrototype';
import { AggregateIdentifier } from '../../../../common/elements/AggregateIdentifier';
import { Application } from '../../../../common/application/Application';
import { cloneDeep } from 'lodash';
import { Command } from '../../../../common/elements/Command';
import { CommandHandler } from '../../../../common/elements/CommandHandler';
import { CommandWithMetadata } from '../../../../common/elements/CommandWithMetadata';
import { ContextIdentifier } from '../../../../common/elements/ContextIdentifier';
import { errors } from '../../../../common/errors';
import { flaschenpost } from 'flaschenpost';
import { getCommandSchema } from '../../../../common/schemas/getCommandSchema';
import { getGraphqlFromJsonSchema } from 'get-graphql-from-jsonschema';
import { OnReceiveCommand } from '../../OnReceiveCommand';
import { ResolverContext } from '../ResolverContext';
import { uuid } from 'uuidv4';
import { validateCommand } from '../../../../common/validators/validateCommand';
import { Value } from 'validate-value';
import {
  buildSchema,
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';

const logger = flaschenpost.getLogger();
const commandSchema = new Value(getCommandSchema());

const getCommandFieldConfiguration = function ({
  application,
  contextName,
  aggregateName,
  commandName,
  commandHandler,
  onReceiveCommand
}: {
  application: Application;
  contextName: string;
  aggregateName: string;
  commandName: string;
  commandHandler: CommandHandler<any, any, any>;
  onReceiveCommand: OnReceiveCommand;
}): GraphQLFieldConfig<{ contextIdentifier: ContextIdentifier; aggregateIdentifier: AggregateIdentifier }, ResolverContext> {
  const resolverArguments: { [argName: string]: GraphQLArgumentConfig } = {};

  // eslint-disable-next-line @typescript-eslint/unbound-method
  if (!commandHandler.getSchema) {
    throw new errors.GraphQlError(`Schema in command '${contextName}.${aggregateName}.${commandName}' is missing, but required for GraphQL.`);
  }

  const schema = commandHandler.getSchema();

  if (!(schema.type === 'object' && Object.keys(schema.properties as object).length === 0)) {
    const typeDefs = getGraphqlFromJsonSchema({
      schema: commandHandler.getSchema(),
      rootName: `${contextName}_${aggregateName}_${commandName}`,
      direction: 'input'
    });
    const schemaForCommandInput = buildSchema(typeDefs.typeDefinitions.join('\n'));

    resolverArguments.data = {
      type: schemaForCommandInput.getType(typeDefs.typeName) as GraphQLInputObjectType
    };
  }

  return {
    type: new GraphQLObjectType({
      name: `${contextName}_${aggregateName}_${commandName}`,
      fields: {
        id: {
          type: GraphQLString,
          resolve (source): string {
            return source.id;
          }
        }
      }
    }),
    args: resolverArguments,
    async resolve (
      { contextIdentifier, aggregateIdentifier },
      { data: rawData },
      { clientMetadata }
    ): Promise<{ id: string }> {
      const data = addMissingPrototype({ value: rawData });

      const command = new Command({
        contextIdentifier,
        aggregateIdentifier,
        name: commandName,
        data: data === undefined ? {} : cloneDeep(data)
      });

      try {
        commandSchema.validate(command, { valueName: 'command' });
      } catch (ex) {
        throw new errors.CommandMalformed(ex.message);
      }
      validateCommand({ command, application });

      const commandId = uuid();
      const commandWithMetadata = new CommandWithMetadata({
        ...command,
        id: commandId,
        metadata: {
          causationId: commandId,
          correlationId: commandId,
          timestamp: Date.now(),
          client: clientMetadata,
          initiator: { user: clientMetadata.user }
        }
      });

      logger.info('Command received.', { command: commandWithMetadata });

      await onReceiveCommand({ command: commandWithMetadata });

      return { id: commandId };
    }
  };
};

export { getCommandFieldConfiguration };
