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

export interface Recipe {
    $engine?: number;
    $onesync?: string;
    name: string;
    version: string;
    author: string;
    description: string;
    variables?: Record<string, string | null>;
    tasks: RecipeTask[];
}

export type RecipeTask =
    | DownloadGithubTask
    | DownloadFileTask
    | UnzipTask
    | MovePathTask
    | CopyPathTask
    | RemovePathTask
    | EnsureDirTask
    | WriteFileTask
    | ReplaceStringTask
    | ConnectDatabaseTask
    | QueryDatabaseTask
    | LoadVarsTask
    | WasteTimeTask;

export interface DownloadGithubTask {
    action: 'download_github';
    src: string;
    ref?: string;
    subpath?: string;
    dest: string;
}

export interface DownloadFileTask {
    action: 'download_file';
    url: string;
    path: string;
}

export interface UnzipTask {
    action: 'unzip';
    src: string;
    dest: string;
}

export interface MovePathTask {
    action: 'move_path';
    src: string;
    dest: string;
    overwrite?: boolean;
}

export interface CopyPathTask {
    action: 'copy_path';
    src: string;
    dest: string;
    overwrite?: boolean;
    errorOnExist?: boolean;
}

export interface RemovePathTask {
    action: 'remove_path';
    path: string;
}

export interface EnsureDirTask {
    action: 'ensure_dir';
    path: string;
}

export interface WriteFileTask {
    action: 'write_file';
    file: string;
    data: string;
    append?: boolean;
}

export interface ReplaceStringTask {
    action: 'replace_string';
    file: string | string[];
    mode?: 'template' | 'all_vars' | 'literal';
    search?: string;
    replace?: string;
}

export interface ConnectDatabaseTask {
    action: 'connect_database';
}

export interface QueryDatabaseTask {
    action: 'query_database';
    file?: string;
    query?: string;
}

export interface LoadVarsTask {
    action: 'load_vars';
    src: string;
}

export interface WasteTimeTask {
    action: 'waste_time';
    seconds: number;
}


export interface RecipeContext {
    /** Variables from recipe + user input (accessible to recipe actions) */
    vars: Record<string, string>;
    /** Sensitive variables hidden from recipe actions (DB creds, license key) */
    sensitiveVars: Record<string, string>;
    /** Base directory (the "jail" root) */
    basePath: string;
    /** MySQL connection (set by connect_database) */
    dbConnection?: import('mysql2/promise').Connection;
    /** Whether to skip database actions */
    skipDb: boolean;
}
