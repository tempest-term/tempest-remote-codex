# Tempest for Codex

Connect saved Tempest servers to Codex's native SSH projects and use Tempest's
terminal automation tools. Both features use the installed **Tempest CLI**;
the Tempest desktop app need not stay open.

Remote control uses the open-source MIT-licensed
[Tempest Remote SDK](https://github.com/tempest-term/tempest-remote-sdk), npm
package `@tempest-term/remote-sdk`, shared with the
[VS Code extension](https://github.com/tempest-term/tempest-remote-vscode).
The SDK owns protocol framing, validation, prompt correlation and handoff;
this plugin supplies terminal UI, a keepalive and Codex links. MCP independently
runs `tempest mcp` through the same local CLI.

## Requirements

- Codex desktop with local plugins and SSH connections.
- [Tempest CLI](https://gotempest.app/download) on the local host's `PATH`.
  `tempest mcp --help` must work; `tempest remote --help` must list `control`
  and `pipe` (remote protocol v1).
- For remote development: Node.js 18+ and OpenSSH locally; an installed,
  authenticated `codex` on the remote login shell's `PATH`.
- A signed-in Tempest account with saved SSH servers. Remote development also
  requires a vault policy permitting TCP forwarding.

## Install

Install the published repository marketplace; the SDK is already bundled:

```sh
codex plugin marketplace add tempest-term/tempest-remote-codex --ref v3.17.3
codex plugin add tempest@tempest
```

Or download the ZIP from [GitHub Releases](https://github.com/tempest-term/tempest-remote-codex/releases/latest),
extract it, and run the two `codex plugin` commands below from its directory.
The plugin needs Tempest CLI on PATH. No npm registry authentication is needed
to install either distribution.

For source development, build and register this repository:

```sh
npm ci
npm run build
codex plugin marketplace add .
codex plugin add tempest@tempest
```

Alternatively, restart Codex, open Plugins, choose the **Tempest** repo
marketplace, and install **tempest**. Start a fresh chat after installation.
Codex loads an installed copy; reinstall/refresh after changing the source.

For source builds, `.npmrc` routes `@tempest-term/remote-sdk` to GitHub Packages.
Set `NODE_AUTH_TOKEN` to a GitHub token with `read:packages`. CI uses
`GITHUB_TOKEN` with `packages: read`; grant this repository Actions access in
the SDK package settings. Built plugin artifacts include the SDK, so plugin
users do not need a registry token.
The committed `lib/` bundle contains the SDK entry point and its license so the
installed plugin works without `node_modules`. CI rebuilds it from the locked
npm dependency and checks that it matches. Refresh the bundle with `npm run build`
when updating SDK. CI also supplies a built plugin artifact.
For a downloaded built artifact, extract it and run only the two `codex plugin`
commands from its directory; npm and registry authentication are only needed
when building from source.

The bundled `.mcp.json` registers `tempest mcp` over stdio. There is no separate
HTTP listener or MCP registration command. If you already configured Tempest
MCP manually, use one registration to avoid duplicate tools; this plugin does
not remove existing configuration. For a custom executable location, configure
an absolute `command` in the installed plugin's MCP settings and pass
`--cli-path /absolute/path/tempest` to the remote helper.

Initial CLI setup: `tempest login`. Inspect accounts with `tempest account list`;
`tempest account use ID_OR_EMAIL` changes the CLI's default account and also the
desktop app's selected account. The remote helper's `--account` option selects
an account for that invocation without changing the default.

## Use

Ask Codex to **connect a saved Tempest server for remote development**, or to
**use Tempest to inspect/run commands in an SSH terminal**. The plugin includes
separate skills for those workflows and the full CLI MCP tools.

The remote helper can also run directly from a local terminal:

```sh
node scripts/remote.js list
node scripts/remote.js connect --server 'ubuntu-cloudnet'
```

Use the script's actual installed path when running outside this repository. Labels must match exactly
(ignoring case); duplicate labels require `--server-id` from `list`.

Authentication prompts are shown locally; passwords are hidden. Noninteractive
calls that need authentication fail with instructions to retry in a local
terminal. No answers are accepted in argv or plugin settings.

After `remote.ensure` succeeds, the helper verifies an SSH attach, prints JSON
with `sshHost` and `addHostUrl`, and holds an SSH connection open. Open that URL
to add the alias to Codex. Connect the host and choose its remote project folder
in Codex. The link leaves automatic connection disabled; it does not register
or open a project automatically.

Keep the helper running until Codex has attached. Ctrl+C releases only the
helper's SSH pipe; other attached pipes remain usable. After the last pipe
closes, the CLI tunnel expires. Run `connect` again before using an expired
saved connection. The helper does not reconnect or replay remote commands.

Tempest CLI manages the Include in `~/.ssh/config`, credentials, keys, proxy
configuration and session lifetime. The plugin never reads private session
descriptors or exports upstream credentials. Run the helper on the local
desktop, not inside a remote project.

New CLI connections use readable aliases, such as
`tempest-ubuntu-cloudnet-6e0f3044c311`. Existing saved connections keep their
assigned names. The plugin uses the alias returned by CLI without decoding it.

## Validation

```sh
npm test
```

Also run `npm run check` and validate the skills after editing them. SDK protocol
tests live in its repository. The SDK dependency is `@tempest-term/remote-sdk`
from GitHub Packages. Before its first release, validate locally with an SDK
tarball using `npm install --no-save --package-lock=false /path/to/sdk.tgz`.
No credentials or SDK source forks are maintained in this plugin.

See [Tempest remote protocol](https://docs.gotempest.app/integrations/tempest-remote-plugin-protocol)
and [Codex deep links](https://learn.chatgpt.com/docs/reference/commands).
