import { AskInfrastructure } from '../elements/AskInfrastructure';
import { errors } from '../errors';
import { exists } from '../utils/fs/exists';
import { Hooks } from '../elements/Hooks';
import { TellInfrastructure } from '../elements/TellInfrastructure';
import { validateHooksDefinition } from '../validators/validateHooksDefinition';

const getHooksDefinition = async function ({ hooksDirectory }: {
  hooksDirectory: string;
}): Promise<Hooks<AskInfrastructure & TellInfrastructure>> {
  if (!await exists({ path: hooksDirectory })) {
    throw new errors.DirectoryNotFound(`Directory '<app>/build/server/hooks' not found.`);
  }

  let hooksDefinition: Hooks<AskInfrastructure & TellInfrastructure>;

  try {
    hooksDefinition = (await import(hooksDirectory)).default;
  } catch (ex) {
    if (ex instanceof SyntaxError) {
      throw new errors.ApplicationMalformed(`Syntax error in '<app>/build/server/hooks'.`, { cause: ex });
    }

    // But throw an error if the entry is a directory without importable content.
    throw new errors.FileNotFound(`No hooks definition in '<app>/build/server/hooks' found.`);
  }

  try {
    validateHooksDefinition({ hooksDefinition });
  } catch (ex) {
    throw new errors.HooksDefinitionMalformed(`Hooks definition '<app>/build/server/hooks' is malformed: ${ex.message}`);
  }

  return hooksDefinition;
};

export { getHooksDefinition };
