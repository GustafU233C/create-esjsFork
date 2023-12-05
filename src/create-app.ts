import { Spinner } from 'cli-spinner';
import fs from 'fs';
import { join } from 'path';
import { bold, cyan, dim, green, yellow } from 'colorette';
import { downloadStarter } from './download';
import { Starter } from './starters';
import { unZipBuffer } from './unzip';
import { npm, onlyUnix, printDuration, setTmpDirectory, terminalPrompt } from './utils';
import { replaceInFile } from 'replace-in-file';
import { commitAllFiles, hasGit, inExistingGitTree, initGit } from './git';

const starterCache = new Map<Starter, Promise<undefined | ((name: string) => Promise<void>)>>();

export async function createApp(starter: Starter, projectName: string, autoRun: boolean) {
  if (fs.existsSync(projectName)) {
    throw new Error(`La carpeta "./${projectName}" ya existe, por favor elige un nombre de proyecto diferente.`);
  }

  projectName = projectName.toLowerCase().trim();

  if (!validateProjectName(projectName)) {
    throw new Error(`El nombre del proyecto "${projectName}" no es válido. Debe ser un nombre kebab-case sin espacios.`);
  }

  const loading = new Spinner(bold('Preparando plantilla...'))
  loading.setSpinnerString(18);
  loading.start();

  const startT = Date.now();
  const moveTo = await prepareStarter(starter);
  if (!moveTo) {
    throw new Error('la instalación de la plantilla falló');
  }
  await moveTo(projectName);
  loading.stop(true);

  const time = printDuration(Date.now() - startT);
  let didGitSucceed = initGitForStarter(projectName);

  if (didGitSucceed) {
    console.log(`${green('✔')} ${bold('Todo listo')} ${onlyUnix('🎉')} ${dim(time)}`);
  } else {
    // an error occurred setting up git for the project. log it, but don't block creating the project
    console.log(`${yellow('❗')} No pudimos asegurarnos de que git estuviera configurado para este proyecto.`);
    console.log(`${green('✔')} ${bold('Sin embargo, tu proyecto fue creado')} ${onlyUnix('🎉')} ${dim(time)}`);
  }

  console.log(`
  ${dim('Te sugerimos que comiences escribiendo:')}

  ${dim(terminalPrompt())} ${green('cd')} ${projectName}
  ${dim(terminalPrompt())} ${green('npm install')}
  ${dim(terminalPrompt())} ${green('npm run dev')}

  ${dim('Los siguientes comandos te pueden ser útiles:')}

  ${dim(terminalPrompt())} ${green('npm run dev')}
    Inicia el servidor de desarrollo.

  ${dim(terminalPrompt())} ${green('npm run build')}
    Construye tu proyecto en modo producción.

  ${renderDocs()}

  ¡Feliz programación! 🎈
`);

  if (autoRun) {
    await npm('start', projectName, 'inherit');
  }
}

function renderDocs() {
  return `
  ${dim('Aprende más sobre EsJS en:')}

  ${dim('-')} ${cyan('https://esjs.dev/')}`;
}

export function prepareStarter(starter: Starter) {
  let promise = starterCache.get(starter);
  if (!promise) {
    promise = prepare(starter);
    // silent crash, we will handle later
    promise.catch(() => {
      return;
    });
    starterCache.set(starter, promise);
  }
  return promise;
}

async function prepare(starter: Starter) {
  const baseDir = process.cwd();
  const tmpPath = join(baseDir, '.tmp-esjs-starter');
  const buffer = await downloadStarter(starter);
  setTmpDirectory(tmpPath);

  await unZipBuffer(buffer, tmpPath);
  await npm('ci', tmpPath);

  return async (projectName: string) => {
    const filePath = join(baseDir, projectName);
    await fs.promises.rename(tmpPath, filePath);
    await replaceInFile({
      files: [join(filePath, '*'), join(filePath, '*')],
      from: /esjs-starter-project-name/g, // TODO: Actualizar plantillas para que puedan reemplazar este valor
      to: projectName,
    });
    setTmpDirectory(null);
  };
}

function validateProjectName(projectName: string) {
  return !/[^a-zA-Z0-9-]/.test(projectName);
}

/**
 * Helper for performing the necessary steps to create a git repository for a new project
 * @param directory the name of the new project's directory
 * @returns true if no issues were encountered, false otherwise
 */
const initGitForStarter = (directory: string): boolean => {
  if (!changeDir(directory) || !hasGit()) {
    // we failed to swtich to the directory to check/create the repo
    // _or_ we didn't have `git` on the path
    return false;
  }

  if (inExistingGitTree()) {
    // we're already in a git tree, don't attempt to create one
    return true;
  }

  if (!initGit()) {
    // we failed to create a new git repo
    return false;
  }

  return commitAllFiles();
};

/**
 * Helper method for switching to a new directory on disk
 * @param moveTo the directory name to switch to
 * @returns true if the switch occurred successfully, false otherwise
 */
export function changeDir(moveTo: string): boolean {
  let wasSuccess = false;
  try {
    process.chdir(moveTo);
    wasSuccess = true;
  } catch (err: unknown) {
    console.error(err);
  }
  return wasSuccess;
}
