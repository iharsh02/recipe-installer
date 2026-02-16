#!/usr/bin/env node
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'path';
import fse from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { fetchRecipe, loadRecipeFromFile } from './parser.js';
import { executeTask } from './actions/index.js';
import { describeTask } from './utils.js';
import { Recipe, RecipeContext } from './types.js';
import { downloadAndExtractArtifacts } from './artifacts.js';
import {
    printBanner,
    printRecipeInfo,
    printInstallSummary,
    printStarting,
    printRecipeTasksHeader,
    printComplete,
} from './ui.js';
import {
    DEFAULT_PROJECT_NAME,
    DEFAULT_DB_HOST,
    DEFAULT_DB_PORT,
    DEFAULT_DB_USERNAME,
    DEFAULT_DB_PASSWORD,
    DEFAULT_DB_NAME,
    DEFAULT_SERVER_NAME,
    DEFAULT_MAX_CLIENTS,
    DEFAULT_SERVER_ENDPOINTS,
    SERVER_DIR_NAME,
    SERVER_DATA_DIR_NAME,
    RECIPE_URL_HINT,
    START_SCRIPT_FILENAME,
    START_SCRIPT_CONTENT,
} from './config.js';

function recipeUsesDatabase(recipe: Recipe): boolean {
    return recipe.tasks.some(
        (t) => t.action === 'connect_database' || t.action === 'query_database'
    );
}

async function generateStartScript(projectDir: string): Promise<void> {
    const scriptPath = path.join(projectDir, START_SCRIPT_FILENAME);
    await fse.writeFile(scriptPath, START_SCRIPT_CONTENT, { mode: 0o700 });
}

async function runRecipeTasks(recipe: Recipe, ctx: RecipeContext): Promise<void> {
    let completed = 0;
    const total = recipe.tasks.length;

    for (const task of recipe.tasks) {
        completed++;
        const prefix = chalk.gray(`[${completed}/${total}]`);
        const description = describeTask(task);
        const spinner = ora(`${prefix} ${description}`).start();

        try {
            await executeTask(task, ctx);
            spinner.succeed(`${prefix} ${description}`);
        } catch (err: any) {
            spinner.fail(`${prefix} ${description}`);
            console.error(chalk.red(`\n  ✖ Error: ${err.message}\n`));

            const { continueOnError } = await prompts({
                type: 'confirm',
                name: 'continueOnError',
                message: 'Continue with remaining tasks?',
                initial: false,
            }, { onCancel: () => process.exit(1) });

            if (!continueOnError) {
                process.exit(1);
            }
        }
    }
}

async function main() {
    printBanner();

    const onCancel = () => {
        console.log(chalk.red('\n  ✖ Cancelled.\n'));
        process.exit(0);
    };

    const args = process.argv.slice(2);
    const skipDb = args.includes('--skip-db');

    const hashFlagIdx = args.indexOf('--artifact-hash');
    const expectedArtifactHash = hashFlagIdx !== -1 ? args[hashFlagIdx + 1] : undefined;

    if (skipDb) {
        console.log(chalk.yellow('  ⚠ Database actions will be skipped (--skip-db)\n'));
    }

    const { projectName } = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Project name',
        initial: DEFAULT_PROJECT_NAME,
        validate: (v: string) => v.trim().length > 0 || 'Project name is required',
    }, { onCancel });

    if (!projectName) {
        console.log(chalk.red('\n  ✖ No project name provided. Exiting.\n'));
        process.exit(1);
    }

    const projectDir = path.resolve(projectName);
    const serverDir = path.join(projectDir, SERVER_DIR_NAME);
    const serverDataDir = path.join(projectDir, SERVER_DATA_DIR_NAME);

    if (await fse.pathExists(projectDir)) {
        const { overwrite } = await prompts({
            type: 'confirm',
            name: 'overwrite',
            message: `Directory "${projectName}" already exists. Continue?`,
            initial: false,
        }, { onCancel });
        if (!overwrite) {
            process.exit(0);
        }
    }

    const { recipeSource } = await prompts({
        type: 'text',
        name: 'recipeSource',
        message: 'Recipe source (URL or local file path)',
        hint: RECIPE_URL_HINT,
    }, { onCancel });

    if (!recipeSource) {
        console.log(chalk.red('\n  ✖ No recipe source provided. Exiting.\n'));
        process.exit(1);
    }

    const loadSpinner = ora('Loading recipe...').start();
    let recipe: Recipe;

    try {
        if (recipeSource.startsWith('http://') || recipeSource.startsWith('https://')) {
            recipe = await fetchRecipe(recipeSource);
        } else {
            recipe = await loadRecipeFromFile(path.resolve(recipeSource));
        }
        loadSpinner.succeed('Recipe loaded successfully');
    } catch (err: any) {
        loadSpinner.fail(`Failed to load recipe: ${err.message}`);
        process.exit(1);
    }

    console.log('');
    printRecipeInfo(recipe);

    let dbVars: Record<string, string> = {};
    const needsDb = recipeUsesDatabase(recipe);

    if (needsDb && !skipDb) {
        console.log(chalk.cyan('\n  🔌 Database Configuration'));
        console.log(chalk.gray('  ─────────────────────────────────────────'));

        const dbConfig = await prompts([
            {
                type: 'text',
                name: 'dbHost',
                message: 'Database host',
                initial: DEFAULT_DB_HOST,
            },
            {
                type: 'text',
                name: 'dbPort',
                message: 'Database port',
                initial: DEFAULT_DB_PORT,
            },
            {
                type: 'text',
                name: 'dbUsername',
                message: 'Database username',
                initial: DEFAULT_DB_USERNAME,
            },
            {
                type: 'password',
                name: 'dbPassword',
                message: 'Database password',
            },
            {
                type: 'text',
                name: 'dbName',
                message: 'Database name',
                initial: DEFAULT_DB_NAME,
            },
        ], { onCancel });

        dbVars = {
            dbHost: dbConfig.dbHost || DEFAULT_DB_HOST,
            dbPort: dbConfig.dbPort || DEFAULT_DB_PORT,
            dbUsername: dbConfig.dbUsername || DEFAULT_DB_USERNAME,
            dbPassword: dbConfig.dbPassword || DEFAULT_DB_PASSWORD,
            dbName: dbConfig.dbName || DEFAULT_DB_NAME,
        };

        const { dbHost, dbPort, dbUsername, dbPassword, dbName } = dbVars;
        dbVars.dbConnectionString =
            `mysql://${encodeURIComponent(dbUsername)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?charset=utf8mb4`;
    }

    console.log(chalk.cyan('\n  🖥️  Server Configuration'));
    console.log(chalk.gray('  ─────────────────────────────────────────'));

    const serverConfig = await prompts([
        {
            type: 'text',
            name: 'svLicense',
            message: 'Server license key (sv_licenseKey)',
            hint: 'Get from keymaster.fivem.net',
        },
        {
            type: 'text',
            name: 'serverName',
            message: 'Server name',
            initial: recipe.name || DEFAULT_SERVER_NAME,
        },
    ], { onCancel });

    printInstallSummary({
        projectName,
        projectDir,
        recipe,
        needsDb,
        skipDb,
        dbName: dbVars.dbName,
    });

    const { confirmed } = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: 'Proceed with installation?',
        initial: true,
    }, { onCancel });

    if (!confirmed) {
        console.log(chalk.red('\n  ✖ Installation cancelled.\n'));
        process.exit(0);
    }

    printStarting();
    const startTime = Date.now();

    const dirSpinner = ora('Creating project directories...').start();
    await fse.ensureDir(serverDir);
    await fse.ensureDir(serverDataDir);
    dirSpinner.succeed(`Created ${chalk.bold(projectName)}/server/ and server-data/`);

    await downloadAndExtractArtifacts(serverDir, expectedArtifactHash);

    printRecipeTasksHeader(recipe.tasks.length);

    const ctx: RecipeContext = {
        vars: {
            ...Object.fromEntries(
                Object.entries(recipe.variables || {}).filter(([, v]) => v != null)
            ) as Record<string, string>,
            dbName: dbVars.dbName || '',
            serverName: serverConfig.serverName || recipe.name,
            recipeName: recipe.name,
            recipeAuthor: recipe.author,
            recipeVersion: recipe.version,
            recipeDescription: recipe.description,
            maxClients: DEFAULT_MAX_CLIENTS,
            serverEndpoints: DEFAULT_SERVER_ENDPOINTS.join('\n'),
        },
        sensitiveVars: {
            dbHost: dbVars.dbHost || '',
            dbPort: dbVars.dbPort || '',
            dbUsername: dbVars.dbUsername || '',
            dbPassword: dbVars.dbPassword || '',
            dbConnectionString: dbVars.dbConnectionString || '',
            svLicense: serverConfig.svLicense || '',
        },
        basePath: serverDataDir,
        skipDb,
    };

    process.on('exit', () => {
        ctx.dbConnection?.end().catch(() => { });
    });

    await runRecipeTasks(recipe, ctx);

    const serverCfgPath = path.join(serverDataDir, 'server.cfg');
    if (await fse.pathExists(serverCfgPath)) {
        let cfg = await fse.readFile(serverCfgPath, 'utf-8');

        const cfgVars: Record<string, string> = {
            svLicense: ctx.sensitiveVars.svLicense || 'changeme',
            serverName: ctx.vars.serverName || recipe.name,
            maxClients: DEFAULT_MAX_CLIENTS,
            serverEndpoints: DEFAULT_SERVER_ENDPOINTS.join('\n'),
            ...(ctx.sensitiveVars.dbConnectionString ? { dbConnectionString: ctx.sensitiveVars.dbConnectionString } : {}),
        };

        cfg = cfg.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return cfgVars[varName] ?? match;
        });

        await fse.writeFile(serverCfgPath, cfg, { encoding: 'utf-8', mode: 0o600 });
    }

    // Clean up tmp directory if recipe didn't remove it
    const tmpDir = path.join(serverDataDir, 'tmp');
    if (await fse.pathExists(tmpDir)) {
        await fse.remove(tmpDir);
    }

    const scriptSpinner = ora('Generating start.sh...').start();
    await generateStartScript(projectDir);
    scriptSpinner.succeed('Generated start.sh');

    if (ctx.dbConnection) {
        await ctx.dbConnection.end();
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    printComplete({ elapsed, projectDir, projectName });
}

main().catch((err) => {
    console.error(chalk.red(`\n  Fatal error: ${err.message}\n`));
    process.exit(1);
});