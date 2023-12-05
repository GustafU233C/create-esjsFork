import { dim } from 'colorette'
import { prompt } from 'prompts'
import { createApp, prepareStarter } from './create-app'
import { verifyStarterExists } from './download'
import { getStarterRepo, Starter, STARTERS } from './starters'
import { cursor, erase } from 'sisteransi';

export async function runInteractive(starterName: string | undefined, autoRun: boolean) {
  process.stdout.write(erase.screen);
  process.stdout.write(cursor.to(0, 1));

  if (!starterName) {
      starterName = await askStarter();
  }

  // Get starter's repo
  const starter = getStarterRepo(starterName);

  // Verify that the starter exists
  const starterExist = verifyStarterExists(starter);
  if (!starterExist) {
    throw new Error(`Plantilla de inicio "${starter.repo}" no encontrada`);
  }

  // Start downloading in the background
  prepareStarter(starter);


  // Get project name
  const projectName = await askProjectName();

  // Ask for confirmation
  const confirm = await askConfirm(starter, projectName);
  if (confirm) {
    await createApp(starter, projectName, autoRun);
  } else {
    console.log('\n  Cancelando...');
  }
}

async function askStarter(): Promise<string> {
  const { starterName }: any = await prompt([
    {
      type: 'select',
      name: 'starterName',
      message: '¿Qué tipo de aplicación quieres crear?',
      choices: getChoices(),
      initial: 0,
    },
  ]);
  if (!starterName) {
    throw new Error(`No indicaste el tipo de aplicación, intenta de nuevo.`);
  }
  return starterName;
}

async function askProjectName () {
  const { projectName }: any = await prompt([
    {
      type: 'text',
      name: 'projectName',
      message: '¿Cómo quieres llamar a tu aplicación?',
      initial: 'mi-proyecto-esjs',
    },
  ]);
  if (!projectName) {
    throw new Error(`No indicaste el nombre de tu proyecto, intenta de nuevo.`);
  }
  return projectName;
}

async function askConfirm(starter: Starter, projectName: string) {
  const { confirm }: any = await prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Estás por crear un nuevo proyecto "${starter.name}" en ./${projectName}. ¿Continuar?`,
      initial: true,
    },
  ]);
  return confirm;
}


/**
 * Generate a terminal-friendly list of options for the user to select from
 * @returns a formatted list of starter options
 */
function getChoices(): ReadonlyArray<{ title: string; value: string }> {
  const maxLength = Math.max(...STARTERS.map((s) => s.name.length)) + 1;
  return [
    ...STARTERS.map((s) => {
      const description = s.description ? dim(s.description) : '';
      return {
        title: `${padEnd(s.name, maxLength)}   ${description}`,
        value: s.name,
      };
    }),
  ];
}

function padEnd(str: string, targetLength: number, padString = ' ') {
  targetLength = targetLength >> 0;
  if (str.length > targetLength) {
    return str;
  }

  targetLength = targetLength - str.length;
  if (targetLength > padString.length) {
    padString += padString.repeat(targetLength / padString.length);
  }

  return String(str) + padString.slice(0, targetLength);
}
