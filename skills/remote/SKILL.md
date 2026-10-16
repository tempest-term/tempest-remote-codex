---
name: remote
description: Connect a saved Tempest SSH server to Codex for remote development, or refresh an expired Tempest remote connection, using the local Tempest CLI.
---

Use the local Tempest CLI's remote protocol. The helper lives at
`../../scripts/remote.js` relative to this skill directory; resolve its absolute
path from this installed skill's location, not the current workspace.

Run on the user's local Codex host, where Tempest CLI, its account/vault, Node.js
18+, and OpenSSH are installed. Do not run inside an SSH project and treat that
remote machine's SSH config as the desktop's config. If this chat is remote,
direct the user to run the helper in a terminal on their local desktop.

1. Check `tempest remote --help` for both `control` and `pipe`. If the CLI is
   missing, direct the user to https://gotempest.app/download. Account setup is
   `tempest login`; inspect accounts with `tempest account list`. Do not change
   the selected account implicitly. The helper accepts `--account ID_OR_EMAIL`
   before its subcommand when a specific account is requested.
2. Discover saved servers:
   `node /absolute/plugin/scripts/remote.js list`.
   Select the server matching the user's request. If several match, ask which
   one; use its exact returned opaque ID, without decoding or reconstructing it.
3. Connect using an argument array or correctly quoted shell arguments:
   `node /absolute/plugin/scripts/remote.js connect --server-id '<returned ID>'`.
   `--server 'exact saved label'` is a convenient alternative for unique labels.
   Keep this command running in a persistent terminal/tool session; it prints a
   JSON readiness result and then holds an SSH attach until stopped. Do not wait
   for process exit before handing the connection to the user.
4. Show `addHostUrl` as a clickable **Add SSH host to Codex** link and state the
   returned `sshHost`. This documented deep link adds the SSH-config alias and
   opens SSH settings with automatic connection disabled. The user connects the
   host and selects their remote folder in Codex. It is not an API for silently
   adding/opening a remote project. The remote login shell needs an installed,
   authenticated `codex` on PATH; do not install or authenticate it without the
   user's request.
5. Tell the user the helper keeps the connection alive. Keep it running through
   the first Codex attach. Stop that helper's session when the user no longer
   needs its keepalive; other attached pipes can continue. Re-run `connect`
   before reopening an expired connection; a saved SSH alias cannot start a
   tunnel by itself. Interrupted remote commands are not automatically replayed.

The helper displays authentication prompts only in an interactive local terminal.
If it reports that interaction is required, have the user run the same command
there. Never ask for passwords, passphrases, OTPs or PINs in chat or put them in
argv/environment. Host-key and security-key confirmation must be answered by the
user after seeing the complete prompt; never auto-accept. Do not echo or log
protocol frames or prompt responses.

Only `remote.ensure` manages SSH config. Use the default `~/.ssh/config` so Codex
can discover the alias; do not hand-edit managed Tempest config or read private
session descriptors. CLI owns credentials, jump hosts, proxies, policies, keys,
and tunnel lifetime. The desktop app need not remain open.

For terminal automation instead of a Codex remote project, use this plugin's
Tempest MCP tools and the sibling `../terminal/SKILL.md` guidance.
