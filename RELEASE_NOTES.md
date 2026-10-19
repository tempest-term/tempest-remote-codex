Tempest Remote for Codex 3.17.4 connects saved Tempest SSH servers to Codex's
native SSH workflow and bundles the full `tempest mcp` stdio integration.

- Uses the shared `@tempest-term/remote-sdk` 0.1.1; accepts CLI-assigned readable SSH names.
- Includes the same Tempest icon as the VS Code extension.
- Includes the SDK runtime and license; plugin installation needs no npm registry login.
- Authentication stays in the local CLI/terminal. The remote helper holds an SSH attach while the user connects and selects a folder in Codex.

Install the repository marketplace:

```sh
codex plugin marketplace add tempest-term/tempest-remote-codex --ref v3.17.4
codex plugin add tempest@tempest
```

Alternatively, download and extract the ZIP, then run `codex plugin marketplace add .`
from its `tempest-remote-codex` directory and install `tempest@tempest`.

Requires Tempest CLI on PATH. Remote development also requires Node.js 18+,
OpenSSH, and an installed/authenticated Codex CLI on the remote host.
