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

import { parse } from 'node-html-parser';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { createHash } from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { execFileSync } from 'child_process';
import ora from 'ora';
import chalk from 'chalk';
import { ARTIFACTS_URL } from './config.js';

async function computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = createHash('sha256');
        const stream = createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

export async function fetchLatestArtifactUrl(): Promise<string> {
    const res = await fetch(ARTIFACTS_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch artifacts page: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const root = parse(html);

    const links = root.querySelectorAll('a');
    for (const link of links) {
        if (link.text.includes('LATEST RECOMMENDED')) {
            const href = link.getAttribute('href');
            if (href) {
                if (href.startsWith('http')) {
                    return href;
                }
                return new URL(href, ARTIFACTS_URL).toString();
            }
        }
    }

    throw new Error(
        'Could not find the latest recommended FXServer build on the artifacts page. ' +
        'The page structure may have changed.'
    );
}

export async function downloadAndExtractArtifacts(
    serverDir: string,
    expectedHash?: string,
): Promise<void> {
    const spinner = ora('Fetching latest FXServer build URL...').start();

    let artifactUrl: string;
    try {
        artifactUrl = await fetchLatestArtifactUrl();
        spinner.text = `Downloading FXServer from ${chalk.gray(artifactUrl)}...`;
    } catch (err: any) {
        spinner.fail(`Failed to get artifact URL: ${err.message}`);
        throw err;
    }

    const tarPath = path.join(serverDir, 'fx.tar.xz');

    try {
        await fs.ensureDir(serverDir);

        const res = await fetch(artifactUrl);
        if (!res.ok) {
            throw new Error(`Download failed: ${res.status} ${res.statusText}`);
        }

        if (!res.body) {
            throw new Error('No response body from artifact download');
        }

        const fileStream = createWriteStream(tarPath);
        await pipeline(Readable.fromWeb(res.body as any), fileStream);

        spinner.text = 'Verifying artifact integrity (SHA256)...';
        const actualHash = await computeFileHash(tarPath);

        if (expectedHash) {
            if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
                throw new Error(
                    `Artifact integrity check failed!\n` +
                    `  Expected SHA256: ${expectedHash}\n` +
                    `  Actual SHA256:   ${actualHash}\n` +
                    `  The downloaded file may have been tampered with.`
                );
            }
            spinner.text = 'Hash verified ✓ — Extracting FXServer...';
        } else {
            console.log(chalk.gray(
                `\n  🔒 Artifact SHA256: ${actualHash}`
            ));
            console.log(chalk.gray(
                `     Pass --artifact-hash ${actualHash} next time to verify automatically.\n`
            ));
            spinner.text = 'Extracting FXServer...';
        }

        execFileSync('tar', ['xf', tarPath, '-C', serverDir], { stdio: 'pipe' });

        spinner.succeed('FXServer downloaded and extracted');
    } catch (err: any) {
        spinner.fail(`Failed to download/extract FXServer: ${err.message}`);

        if (err.message.includes('tar') || err.message.includes('xz')) {
            console.log(chalk.yellow(
                '\n  💡 Make sure xz-utils is installed: sudo apt install xz-utils\n'
            ));
        }

        throw err;
    } finally {
        await fs.remove(tarPath).catch(() => { });
    }
}
