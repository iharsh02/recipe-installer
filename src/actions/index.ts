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

import { RecipeTask, RecipeContext } from '../types.js';
import { downloadGithub } from './download_github.js';
import { downloadFile } from './download_file.js';
import { unzip, movePath, copyPath, removePath, ensureDir } from './filesystem.js';
import { writeFile, replaceString } from './write_file.js';
import { connectDatabase, queryDatabase } from './database.js';
import { loadVars, wasteTime } from './misc.js';

export type ActionHandler = (task: any, ctx: RecipeContext) => Promise<void>;

const actionHandlers: Record<string, ActionHandler> = {
    download_github: downloadGithub,
    download_file: downloadFile,
    unzip,
    move_path: movePath,
    copy_path: copyPath,
    remove_path: removePath,
    ensure_dir: ensureDir,
    write_file: writeFile,
    replace_string: replaceString,
    connect_database: connectDatabase,
    query_database: queryDatabase,
    load_vars: loadVars,
    waste_time: wasteTime,
};

export async function executeTask(
    task: RecipeTask,
    ctx: RecipeContext
): Promise<void> {
    const handler = actionHandlers[task.action];
    if (!handler) {
        throw new Error(`Unknown action: ${task.action}`);
    }

    await handler(task, ctx);
}

export { actionHandlers };
