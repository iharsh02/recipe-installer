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

import { readFile } from 'fs/promises';
import { LoadVarsTask, WasteTimeTask, RecipeContext } from '../types.js';
import { resolveSafePath } from '../utils.js';

export async function loadVars(
    task: LoadVarsTask,
    ctx: RecipeContext
): Promise<void> {
    const filePath = resolveSafePath(ctx.basePath, task.src);
    const content = await readFile(filePath, 'utf-8');
    const vars = JSON.parse(content);

    if (typeof vars !== 'object' || vars === null) {
        throw new Error(`load_vars: expected JSON object in ${task.src}`);
    }

    Object.assign(ctx.vars, vars);
}


export async function wasteTime(
    task: WasteTimeTask,
    _ctx: RecipeContext
): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, task.seconds * 1000));
}
