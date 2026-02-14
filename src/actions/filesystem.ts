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
import unzipper from 'unzipper';
import {
    UnzipTask,
    MovePathTask,
    CopyPathTask,
    RemovePathTask,
    EnsureDirTask,
    RecipeContext,
} from '../types.js';
import { resolveSafePath } from '../utils.js';

export async function unzip(
    task: UnzipTask,
    ctx: RecipeContext
): Promise<void> {
    const srcPath = resolveSafePath(ctx.basePath, task.src);
    const destPath = resolveSafePath(ctx.basePath, task.dest);

    await fse.ensureDir(destPath);

    await fse
        .createReadStream(srcPath)
        .pipe(unzipper.Extract({ path: destPath }))
        .promise();
}

export async function movePath(
    task: MovePathTask,
    ctx: RecipeContext
): Promise<void> {
    const srcPath = resolveSafePath(ctx.basePath, task.src);
    const destPath = resolveSafePath(ctx.basePath, task.dest);

    await fse.ensureDir(path.dirname(destPath));
    await fse.move(srcPath, destPath, { overwrite: task.overwrite ?? false });
}

export async function copyPath(
    task: CopyPathTask,
    ctx: RecipeContext
): Promise<void> {
    const srcPath = resolveSafePath(ctx.basePath, task.src);
    const destPath = resolveSafePath(ctx.basePath, task.dest);

    await fse.ensureDir(path.dirname(destPath));
    await fse.copy(srcPath, destPath, {
        overwrite: task.overwrite ?? true,
        errorOnExist: task.errorOnExist ?? false,
    });
}

export async function removePath(
    task: RemovePathTask,
    ctx: RecipeContext
): Promise<void> {
    const targetPath = resolveSafePath(ctx.basePath, task.path);
    await fse.remove(targetPath);
}

export async function ensureDir(
    task: EnsureDirTask,
    ctx: RecipeContext
): Promise<void> {
    const targetPath = resolveSafePath(ctx.basePath, task.path);
    await fse.ensureDir(targetPath);
}
