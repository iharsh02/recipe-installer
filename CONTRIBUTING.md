# Contributing to tx-run

Thank you for your interest in contributing to tx-run!

## Project Setup

1.  **Fork** the repository on GitHub.
2.  **Clone** your fork locally:
    ```bash
    git clone https://github.com/iharsh02/tx-run.git
    cd tx-run
    ```
3.  **Install dependencies** (we use pnpm):
    ```bash
    pnpm install
    ```
4.  **Run the project** in development mode:
    ```bash
    pnpm dev
    ```
5.  **Build** the project to verify compilation:
    ```bash
    pnpm build
    ```

## How to Submit a Pull Request

1.  Create a new **branch** for your feature or fix:
    ```bash
    git checkout -b my-new-feature
    ```
2.  **Commit** your changes with clear messages.
3.  **Push** to your fork:
    ```bash
    git push origin my-new-feature
    ```
4.  Open a **Pull Request** against the `main` branch of the upstream repository.
5.  Describe your changes and link to any relevant issues.

## Code Style

-   We use **TypeScript**.
-   Ensure `pnpm build` passes without errors before submitting.
-   Follow the existing code style (clean, readable, no emojis in UI output unless necessary).
