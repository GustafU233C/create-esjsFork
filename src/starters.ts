/**
 * Metadata for a starter project that the CLI will use to bootstrap a user's project.
 */
export interface Starter {
  /**
   * The name of the starter.
   */
  name: string;
  /**
   * The GitHub repository the starter can be found in. The base URL is assumed to exist and does not need to be
   * provided.
   */
  repo: string;
  /**
   * A brief description of the starter project.
   */
  description?: string;
}

/**
 * Existing Stencil project starters available for CLI users to select from
 */
export const STARTERS: ReadonlyArray<Starter> = [
  {
    name: 'terminal',
    repo: 'es-js/crear-terminal-app',
    description: 'Crea una aplicación web en modo Terminal',
  },
  {
    name: 'hono',
    repo: 'es-js/crear-hono-app',
    description: 'Crea una aplicación web del lado del servidor con Hono',
  },
  {
    name: 'discord',
    repo: 'es-js/crear-discord-bot',
    description: 'Crea un Bot de Discord',
  }
];

/**
 * Retrieve a starter project's metadata based on a CLI user's input.
 *
 * @param starterName the name of the starter project to retrieve. Starter names that include a forward slash ('/') are
 * assumed to be custom starter templates. Such templates are assumed to be the name of the repository that this CLI
 * can retrieve the starter template from.
 * @returns the starter project metadata
 */
export function getStarterRepo(starterName: string): Starter {
  if (starterName.includes('/')) {
    return {
      name: starterName,
      repo: starterName,
    };
  }
  const repo = STARTERS.find((starter) => starter.name === starterName);
  if (!repo) {
    throw new Error(`Starter "${starterName}" does not exist.`);
  }
  return repo;
}
