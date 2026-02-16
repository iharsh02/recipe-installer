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

import chalk from 'chalk';
import { Recipe } from './types.js';

export function printBanner() {
    console.log('');
    console.log(chalk.red.bold('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.red.bold('  ║') + chalk.yellow.bold('   🤠 tx-run — RedM Server Setup (Linux)') + chalk.red.bold('║'));
    console.log(chalk.red.bold('  ║') + chalk.gray('   End-to-end server bootstrapper        ') + chalk.red.bold('║'));
    console.log(chalk.red.bold('  ╚══════════════════════════════════════════╝'));
    console.log('');
}

export function printRecipeInfo(recipe: Recipe) {
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

export function printInstallSummary(opts: {
    projectName: string;
    projectDir: string;
    recipe: Recipe;
    needsDb: boolean;
    skipDb: boolean;
    dbName?: string;
}) {
    const { projectName, projectDir, recipe, needsDb, skipDb, dbName } = opts;

    console.log(chalk.cyan('\n  📋 Installation Summary'));
    console.log(chalk.gray('  ─────────────────────────────────────────'));
    console.log(`  ${chalk.bold('Project:')}    ${projectName}`);
    console.log(`  ${chalk.bold('Recipe:')}     ${recipe.name} v${recipe.version}`);
    console.log(`  ${chalk.bold('Structure:')}`);
    console.log(chalk.gray(`    ${projectDir}/`));
    console.log(chalk.gray(`    ├── server/          ${chalk.white('(FXServer binaries)')}`));
    console.log(chalk.gray(`    ├── server-data/     ${chalk.white('(Framework + resources)')}`));
    console.log(chalk.gray(`    └── start.sh         ${chalk.white('(Launcher script)')}`));
    console.log(`  ${chalk.bold('Database:')}   ${needsDb ? (skipDb ? chalk.yellow('Skipped') : chalk.green(dbName)) : chalk.gray('Not needed')}`);
    console.log('');
}

export function printStarting() {
    console.log(chalk.cyan.bold('\n  🚀 Starting Installation\n'));
}

export function printRecipeTasksHeader(taskCount: number) {
    console.log(chalk.cyan(`\n  📦 Running recipe (${taskCount} tasks)\n`));
}

export function printComplete(opts: {
    elapsed: string;
    projectDir: string;
    projectName: string;
}) {
    const { elapsed, projectDir, projectName } = opts;

    console.log('');
    console.log(chalk.green.bold('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.green.bold('  ║') + chalk.white.bold('   ✅ Server Setup Complete!              ') + chalk.green.bold('║'));
    console.log(chalk.green.bold('  ╚══════════════════════════════════════════╝'));
    console.log('');
    console.log(`  ${chalk.bold('Time:')}      ${elapsed}s`);
    console.log(`  ${chalk.bold('Project:')}   ${projectDir}`);
    console.log('');
    console.log(chalk.cyan('  To start your server:'));
    console.log('');
    console.log(chalk.white(`    cd ${projectName}`));
    console.log(chalk.white('    ./start.sh'));
    console.log('');
}
