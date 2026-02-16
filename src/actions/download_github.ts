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

import { createWriteStream, lstatSync } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { extract } from 'tar';
import fse from 'fs-extra';
import { DownloadGithubTask, RecipeContext } from '../types.js';
import { resolveSafePath } from '../utils.js';

const branchCache = new Map<string, string>();

export async function downloadGithub(
    task: DownloadGithubTask,
    ctx: RecipeContext
): Promise<void> {
    const { owner, repo } = parseGithubSrc(task.src);
    const ref = task.ref || await getDefaultBranch(owner, repo);
    const destPath = resolveSafePath(ctx.basePath, task.dest);

    const tarballUrl = `https://github.com/${owner}/${repo}/archive/${ref}.tar.gz`;
    const tmpDir = resolveSafePath(ctx.basePath, './tmp/_github_dl');
    await fse.ensureDir(tmpDir);

    const tarballPath = path.join(tmpDir, `${repo}-${ref}.tar.gz`);
    const extractDir = path.join(tmpDir, `${repo}-extract`);

    try {
        const response = await fetchWithRetry(tarballUrl);

        if (!response.body) {
            throw new Error(`No response body from ${tarballUrl}`);
        }

        const fileStream = createWriteStream(tarballPath);
        await pipeline(response.body as any, fileStream);

        await fse.ensureDir(extractDir);

        await (extract as any)({
            file: tarballPath,
            cwd: extractDir,
            noSymlinks: true,
        });

        const extractedEntries = await fse.readdir(extractDir);
        if (extractedEntries.length === 0) {
            throw new Error(`Tarball extracted empty directory for ${owner}/${repo}@${ref}`);
        }
        const extractedFolder = path.join(extractDir, extractedEntries[0]);

        let srcPath = extractedFolder;
        if (task.subpath) {
            srcPath = path.join(extractedFolder, task.subpath);
            if (!(await fse.pathExists(srcPath))) {
                throw new Error(
                    `Subpath "${task.subpath}" not found in ${owner}/${repo}@${ref}`
                );
            }
        }

        await fse.ensureDir(path.dirname(destPath));
        await fse.copy(srcPath, destPath, {
            overwrite: true,
            filter: (src) => {
                try { return !lstatSync(src).isSymbolicLink(); } catch { return true; }
            },
        });
    } finally {
        await fse.remove(tarballPath).catch(() => { });
        await fse.remove(extractDir).catch(() => { });
    }
}

function parseGithubSrc(src: string): { owner: string; repo: string } {
    const urlMatch = src.match(
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/
    );
    if (urlMatch) {
        return { owner: urlMatch[1], repo: urlMatch[2] };
    }

    const parts = src.split('/');
    if (parts.length === 2) {
        return { owner: parts[0], repo: parts[1] };
    }

    throw new Error(`Invalid GitHub source: ${src}`);
}

async function getDefaultBranch(
    owner: string,
    repo: string
): Promise<string> {
    const cacheKey = `${owner}/${repo}`;
    const cached = branchCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            { signal: AbortSignal.timeout(10_000) }
        );
        if (response.ok) {
            const data = (await response.json()) as { default_branch: string };
            branchCache.set(cacheKey, data.default_branch);
            return data.default_branch;
        }
    } catch {
    }
    branchCache.set(cacheKey, 'main');
    return 'main';
}

async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const response = await fetch(url, {
            redirect: 'follow',
            signal: AbortSignal.timeout(30_000),
        });
        if (response.ok) return response;

        if (attempt < retries) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
        }

        throw new Error(
            `Failed to download ${url}: ${response.status} ${response.statusText}`
        );
    }
    throw new Error(`Failed to download ${url} after ${retries + 1} attempts`);
}
