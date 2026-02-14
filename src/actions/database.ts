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
import mysql from 'mysql2/promise';
import { ConnectDatabaseTask, QueryDatabaseTask, RecipeContext } from '../types.js';
import { resolveSafePath } from '../utils.js';

export async function connectDatabase(
    _task: ConnectDatabaseTask,
    ctx: RecipeContext
): Promise<void> {
    if (ctx.skipDb) {
        return;
    }

    const connection = await mysql.createConnection({
        host: ctx.vars['dbHost'] || 'localhost',
        port: parseInt(ctx.vars['dbPort'] || '3306', 10),
        user: ctx.vars['dbUsername'] || 'root',
        password: ctx.vars['dbPassword'] || '',
        multipleStatements: true,
    });

    // Create database if it doesn't exist
    const dbName = ctx.vars['dbName'];
    if (dbName) {
        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${dbName}\``
        );
        await connection.query(`USE \`${dbName}\``);
    }

    ctx.dbConnection = connection;
}

//   Execute SQL
export async function queryDatabase(
    task: QueryDatabaseTask,
    ctx: RecipeContext
): Promise<void> {
    if (ctx.skipDb) {
        return;
    }

    if (!ctx.dbConnection) {
        throw new Error(
            'No database connection. Did you forget a connect_database action before query_database?'
        );
    }

    let sql: string;

    if (task.file) {
        const filePath = resolveSafePath(ctx.basePath, task.file);
        sql = await readFile(filePath, 'utf-8');
    } else if (task.query) {
        sql = task.query;
    } else {
        throw new Error('query_database requires either "file" or "query"');
    }

    await ctx.dbConnection.query(sql);
}
