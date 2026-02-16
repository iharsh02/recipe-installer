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

import { parse as parseYaml } from 'yaml';
import { readFile } from 'fs/promises';
import { Recipe } from './types.js';

//   Parse raw YAML content into a typed Recipe object.
export function parseRecipe(yamlContent: string): Recipe {
    const raw = parseYaml(yamlContent);

    if (!raw || typeof raw !== 'object') {
        throw new Error('Invalid recipe: YAML did not parse to an object');
    }

    if (!raw.tasks || !Array.isArray(raw.tasks)) {
        throw new Error('Invalid recipe: missing or invalid "tasks" array');
    }

    if (!raw.name) {
        throw new Error('Invalid recipe: missing "name" field');
    }

    for (const [i, task] of raw.tasks.entries()) {
        if (!task.action || typeof task.action !== 'string') {
            throw new Error(`Invalid recipe: task ${i + 1} is missing a valid "action" field`);
        }
    }

    return {
        version: '0.0.0',
        author: 'Unknown',
        description: '',
        ...raw,
    } as Recipe;
}

//   Fetch a recipe from a remote URL and parse it.
export async function fetchRecipe(url: string): Promise<Recipe> {
    const rawUrl = toRawGithubUrl(url);

    const response = await fetch(rawUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch recipe from ${rawUrl}: ${response.status} ${response.statusText}`);
    }

    const yamlContent = await response.text();
    return parseRecipe(yamlContent);
}

//   Load a recipe from a local file path.
export async function loadRecipeFromFile(filePath: string): Promise<Recipe> {
    const yamlContent = await readFile(filePath, 'utf-8');
    return parseRecipe(yamlContent);
}

//   Convert GitHub blob/tree URLs to raw content URLs.
function toRawGithubUrl(url: string): string {
    const githubMatch = url.match(
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/
    );
    if (githubMatch) {
        const [, owner, repo, rest] = githubMatch;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
    }

    return url;
}
