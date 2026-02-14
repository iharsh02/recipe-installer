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

//  Resolve a relative path against the base directory,
export function resolveSafePath(basePath: string, relativePath: string): string {
    const resolved = path.resolve(basePath, relativePath);
    const normalizedBase = path.resolve(basePath);

    if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
        throw new Error(
            `Path "${relativePath}" resolves outside the base directory. ` +
            `Resolved: ${resolved}, Base: ${normalizedBase}`
        );
    }

    return resolved;
}

export function describeTask(task: { action: string;[key: string]: any }): string {
    switch (task.action) {
        case 'download_github': {
            const repoName = task.src.replace(/^https?:\/\/github\.com\//, '');
            return `📦 Clone ${repoName} → ${task.dest}`;
        }
        case 'download_file':
            return `📥 Download ${task.url} → ${task.path}`;
        case 'unzip':
            return `📂 Unzip ${task.src} → ${task.dest}`;
        case 'move_path':
            return `📁 Move ${task.src} → ${task.dest}`;
        case 'copy_path':
            return `📋 Copy ${task.src} → ${task.dest}`;
        case 'remove_path':
            return `🗑️  Remove ${task.path}`;
        case 'ensure_dir':
            return `📁 Ensure dir ${task.path}`;
        case 'write_file':
            return `📝 Write ${task.file}${task.append ? ' (append)' : ''}`;
        case 'replace_string': {
            const files = Array.isArray(task.file) ? task.file.join(', ') : task.file;
            return `🔄 Replace strings in ${files}`;
        }
        case 'connect_database':
            return `🔌 Connect to database`;
        case 'query_database':
            return `💾 Run SQL${task.file ? ` from ${task.file}` : ''}`;
        case 'load_vars':
            return `📋 Load vars from ${task.src}`;
        case 'waste_time':
            return `⏳ Waiting ${task.seconds}s (anti-throttle)`;
        default:
            return `❓ Unknown action: ${task.action}`;
    }
}
