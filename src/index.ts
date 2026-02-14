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

function printBanner() {
    console.log('');
    console.log(chalk.red.bold('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.red.bold('  ║') + chalk.yellow.bold('   🤠 RedM Recipe Installer (Linux)     ') + chalk.red.bold('║'));
    console.log(chalk.red.bold('  ║') + chalk.gray('   txAdmin-compatible recipe executor    ') + chalk.red.bold('║'));
    console.log(chalk.red.bold('  ╚══════════════════════════════════════════╝'));
    console.log('');
}

function printRecipeInfo(recipe: Recipe) {
    console.log(chalk.cyan.bold('  📜 Recipe Information'));
    console.log(chalk.gray('  ─────────────────────────────────────────'));
    console.log(`  ${chalk.bold('Name:')}         ${recipe.name}`);
    console.log(`  ${chalk.bold('Version:')}      ${recipe.version}`);
    console.log(`  ${chalk.bold('Author:')}       ${recipe.author}`);
    console.log(`  ${chalk.bold('Description:')}  ${recipe.description}`);
    console.log(`  ${chalk.bold('Tasks:')}        ${recipe.tasks.length} steps`);
    if (recipe.$onesync) {
        console.log(`  ${chalk.bold('OneSync:')}      ${recipe.$onesync}`);
    }
    console.log('');
}

function recipeUsesDatabase(recipe: Recipe): boolean {
    return recipe.tasks.some(
        (t) => t.action === 'connect_database' || t.action === 'query_database'
    );
}


async function main() {
    printBanner();

    // Parse CLI args
    const args = process.argv.slice(2);
    const skipDb = args.includes('--skip-db');

    if (skipDb) {
        console.log(chalk.yellow('  ⚠ Database actions will be skipped (--skip-db)\n'));
    }


    const { recipeSource } = await prompts({
        type: 'text',
        name: 'recipeSource',
        message: 'Recipe source (URL or local file path)',
        hint: 'e.g. https://github.com/Rexshack-RedM/txAdminRecipe/blob/main/rsgcore.yaml',
    });

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


    const { targetDir } = await prompts({
        type: 'text',
        name: 'targetDir',
        message: 'Installation directory',
        initial: './server',
    });

    if (!targetDir) {
        console.log(chalk.red('\n  ✖ No target directory provided. Exiting.\n'));
        process.exit(1);
    }

    const basePath = path.resolve(targetDir);

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
                initial: 'localhost',
            },
            {
                type: 'text',
                name: 'dbPort',
                message: 'Database port',
                initial: '3306',
            },
            {
                type: 'text',
                name: 'dbUsername',
                message: 'Database username',
                initial: 'root',
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
                initial: 'rsg_redm',
            },
        ]);

        dbVars = {
            dbHost: dbConfig.dbHost || 'localhost',
            dbPort: dbConfig.dbPort || '3306',
            dbUsername: dbConfig.dbUsername || 'root',
            dbPassword: dbConfig.dbPassword || '',
            dbName: dbConfig.dbName || 'rsg_redm',
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
            initial: recipe.name || 'My RedM Server',
        },
    ]);

    console.log(chalk.cyan('\n  📋 Installation Summary'));
    console.log(chalk.gray('  ─────────────────────────────────────────'));
    console.log(`  ${chalk.bold('Recipe:')}      ${recipe.name} v${recipe.version}`);
    console.log(`  ${chalk.bold('Target:')}      ${basePath}`);
    console.log(`  ${chalk.bold('Tasks:')}       ${recipe.tasks.length} steps`);
    console.log(`  ${chalk.bold('Database:')}    ${needsDb ? (skipDb ? chalk.yellow('Skipped') : chalk.green(dbVars.dbName)) : chalk.gray('Not needed')}`);
    console.log('');

    const { confirmed } = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: 'Proceed with installation?',
        initial: true,
    });

    if (!confirmed) {
        console.log(chalk.red('\n  ✖ Installation cancelled.\n'));
        process.exit(0);
    }


    console.log(chalk.cyan.bold('\n  🚀 Starting Installation\n'));

    const ctx: RecipeContext = {
        vars: {
            ...Object.fromEntries(
                Object.entries(recipe.variables || {}).filter(([, v]) => v != null)
            ) as Record<string, string>,
            ...dbVars,
            svLicense: serverConfig.svLicense || '',
            serverName: serverConfig.serverName || recipe.name,
            recipeName: recipe.name,
            recipeAuthor: recipe.author,
            recipeVersion: recipe.version,
            recipeDescription: recipe.description,
            maxClients: '32',
            serverEndpoints: 'endpoint_add_tcp "0.0.0.0:30120"\nendpoint_add_udp "0.0.0.0:30120"',
        },
        basePath,
        skipDb,
    };

    await fse.ensureDir(basePath);

    process.on('exit', () => {
        ctx.dbConnection?.end().catch(() => { });
    });

    let completed = 0;
    const total = recipe.tasks.length;
    const startTime = Date.now();

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
            });

            if (!continueOnError) {
                process.exit(1);
            }
        }
    }


    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const serverCfgPath = path.join(basePath, 'server.cfg');
    if (await fse.pathExists(serverCfgPath)) {
        let cfg = await fse.readFile(serverCfgPath, 'utf-8');
        cfg = cfg.replace(/\{\{svLicense\}\}/g, serverConfig.svLicense || 'changeme');
        cfg = cfg.replace(
            /\{\{serverName\}\}/g,
            serverConfig.serverName || recipe.name
        );
        cfg = cfg.replace(/\{\{maxClients\}\}/g, '32');
        cfg = cfg.replace(
            /\{\{serverEndpoints\}\}/g,
            'endpoint_add_tcp "0.0.0.0:30120"\nendpoint_add_udp "0.0.0.0:30120"'
        );
        if (dbVars.dbConnectionString) {
            cfg = cfg.replace(
                /\{\{dbConnectionString\}\}/g,
                dbVars.dbConnectionString
            );
        }
        await fse.writeFile(serverCfgPath, cfg, 'utf-8');
    }

    if (ctx.dbConnection) {
        await ctx.dbConnection.end();
    }

    console.log('');
    console.log(chalk.green.bold('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.green.bold('  ║') + chalk.white.bold('   ✅ Installation Complete!              ') + chalk.green.bold('║'));
    console.log(chalk.green.bold('  ╚══════════════════════════════════════════╝'));
    console.log('');
    console.log(`  ${chalk.bold('Time:')}    ${elapsed}s`);
    console.log(`  ${chalk.bold('Target:')}  ${basePath}`);
    console.log('');
    console.log(chalk.gray('  To start your server, run your RedM server binary'));
    console.log(chalk.gray(`  with +exec ${serverCfgPath}`));
    console.log('');
}

main().catch((err) => {
    console.error(chalk.red(`\n  Fatal error: ${err.message}\n`));
    process.exit(1);
});