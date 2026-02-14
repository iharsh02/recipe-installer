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

import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import fse from 'fs-extra';
import { DownloadFileTask, RecipeContext } from '../types.js';
import { resolveSafePath } from '../utils.js';

export async function downloadFile(
    task: DownloadFileTask,
    ctx: RecipeContext
): Promise<void> {
    const destPath = resolveSafePath(ctx.basePath, task.path);

    await fse.ensureDir(path.dirname(destPath));

    const response = await fetch(task.url, { redirect: 'follow' });
    if (!response.ok) {
        throw new Error(
            `Failed to download ${task.url}: ${response.status} ${response.statusText}`
        );
    }

    if (!response.body) {
        throw new Error(`No response body from ${task.url}`);
    }

    const fileStream = createWriteStream(destPath);
    await pipeline(response.body as any, fileStream);
}
