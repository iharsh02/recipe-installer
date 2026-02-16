# tx-run

txAdmin-compatible recipe installer for RedM servers on Linux.

## Usage

Run the installer directly using npx:

```bash
npx tx-run
```

You can also specify an optional hash for the FXServer artifact to verify its integrity:

```bash
npx tx-run --artifact-hash <sha256-hash>
```

Follow the interactive prompts to:
1. Enter a project name
2. Provide a recipe URL (e.g. from a GitHub raw link)
3. Configure database connection details
4. Set server license key

## Security Warning

**IMPORTANT: Only run recipes from sources you trust.**

A malicious recipe YAML has the same power as running a shell script on your machine. It can:
- Write or overwrite files in your server directory
- Run arbitrary SQL queries on your database
- Download files from arbitrary URLs

Always verify the contents of a recipe file before running it.
