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

import { readFile, appendFile } from 'fs/promises';
import fse from 'fs-extra';
import { WriteFileTask, ReplaceStringTask, RecipeContext } from '../types.js';
import { resolveSafePath } from '../utils.js';

export async function writeFile(
    task: WriteFileTask,
    ctx: RecipeContext
): Promise<void> {
    const filePath = resolveSafePath(ctx.basePath, task.file);

    if (task.append) {
        await appendFile(filePath, task.data, 'utf-8');
    } else {
        await fse.outputFile(filePath, task.data, 'utf-8');
    }
}

export async function replaceString(
    task: ReplaceStringTask,
    ctx: RecipeContext
): Promise<void> {
    const files = Array.isArray(task.file) ? task.file : [task.file];
    const mode = task.mode || 'template';

    for (const file of files) {
        const filePath = resolveSafePath(ctx.basePath, file);
        let content = await readFile(filePath, 'utf-8');

        switch (mode) {
            case 'all_vars':
                content = content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                    return ctx.vars[varName] ?? match;
                });
                break;

            case 'template':
                if (task.search && task.replace !== undefined) {
                    const processedReplace = task.replace.replace(
                        /\{\{(\w+)\}\}/g,
                        (match, varName) => ctx.vars[varName] ?? match
                    );
                    content = content.replaceAll(task.search, processedReplace);
                }
                break;

            case 'literal':
                if (task.search && task.replace !== undefined) {
                    content = content.replaceAll(task.search, task.replace);
                }
                break;
        }

        await fse.outputFile(filePath, content, 'utf-8');
    }
}
