#!/usr/bin/env node
'use strict';
const { spawn } = require('node:child_process');
const { parseArgs } = require('node:util');
const readline = require('node:readline');
const { ControlClient } = require('../lib/remote-sdk.cjs');

function selectServer(servers, { server, serverId }) {
  const matches = servers.filter(entry => serverId ? entry.id === serverId
    : entry.label.toLowerCase() === server.toLowerCase());
  if (matches.length !== 1) throw new Error('Server missing or label ambiguous. Run list and use an exact --server-id.');
  return matches[0];
}
function connectionResult(remote) {
  return {
    sshHost: remote.sshHost,
    addHostUrl: `codex://settings/connections/ssh/add?${new URLSearchParams({ name: remote.sshHost })}`,
    status: 'connected',
  };
}

// Only the local terminal receives authentication input. Passwords never echo.
function readAnswer(message, hidden = false) {
  const input = process.stdin;
  const output = process.stderr;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    output.write('Authentication needs an interactive local terminal. Run this command there; do not send answers in chat.\n');
    return Promise.resolve(undefined);
  }
  output.write(`${message}\n> `);
  readline.emitKeypressEvents(input);
  const wasRaw = Boolean(input.isRaw);
  input.setRawMode(true);
  input.resume();
  return new Promise(resolve => {
    let answer = '';
    function finish(value) {
      input.removeListener('keypress', onKey);
      input.setRawMode(wasRaw);
      input.pause();
      output.write('\n');
      resolve(value);
    }
    function onKey(text, key = {}) {
      if (key.ctrl && ['c', 'd'].includes(key.name)) return finish(undefined);
      if (key.name === 'return' || key.name === 'enter') return finish(answer);
      if (key.name === 'backspace') {
        if (answer) {
          answer = [...answer].slice(0, -1).join('');
          if (!hidden) output.write('\b \b');
        }
      } else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) {
        answer += text;
        if (!hidden) output.write(text);
      }
    }
    input.on('keypress', onKey);
  });
}
async function showPrompt(prompt) {
  if (!['password', 'text', 'confirm'].includes(prompt.kind)) return undefined;
  const answer = await readAnswer(prompt.kind === 'confirm'
    ? `${prompt.message}\nAccept? [y/N]` : prompt.message, prompt.kind === 'password');
  if (answer === undefined) return undefined;
  return prompt.kind === 'confirm' ? /^(y|yes)$/i.test(answer.trim()) : answer;
}

function exited(child) {
  return new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error('Cannot launch OpenSSH. Check ssh on PATH.')));
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}
async function probeSsh(args, spawnProcess = spawn) {
  const child = spawnProcess('ssh', args, { stdio: 'ignore', shell: false, windowsHide: true });
  const timer = setTimeout(() => child.kill(), 25000);
  try {
    const result = await exited(child);
    if (result.code !== 0) throw new Error('SSH attach failed. Retry connect to refresh the session.');
  } finally { clearTimeout(timer); }
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    'cli-path': { type: 'string', default: 'tempest' },
    account: { type: 'string' }, server: { type: 'string' },
    'server-id': { type: 'string' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) {
    console.log('Usage: node scripts/remote.js [--cli-path PATH] [--account ID] list|connect [--server LABEL | --server-id ID]');
    return;
  }
  const [command] = positionals;
  if (positionals.length !== 1 || !['list', 'connect'].includes(command)) throw new Error('Choose list or connect. Use --help for usage.');
  if (command === 'connect' && Number(Boolean(values.server)) + Number(Boolean(values['server-id'])) !== 1) {
    throw new Error('Connect requires exactly one of --server or --server-id.');
  }
  const control = new ControlClient(values['cli-path'], showPrompt, { account: values.account });
  let keepalive;
  let handedOff = false;
  let stopping = false;
  const stop = () => {
    stopping = true;
    control.cancel();
    keepalive?.kill();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const servers = await control.listServers();
    if (command === 'list') {
      console.log(JSON.stringify(servers));
      return;
    }
    const server = selectServer(servers, { server: values.server, serverId: values['server-id'] });
    const remote = await control.ensureRemote(server.id);
    const sshArgs = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-o',
      'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3'];
    keepalive = spawn('ssh', [...sshArgs, '-N', remote.sshHost], {
      stdio: 'ignore', shell: false, windowsHide: true, detached: true,
    });
    const alive = exited(keepalive);
    alive.catch(() => {}); // Observe early spawn errors while the probe runs.
    await probeSsh([...sshArgs, remote.sshHost, 'true']);
    if (keepalive.exitCode !== null || keepalive.signalCode !== null || stopping) {
      throw new Error('SSH keepalive ended before handoff. Retry connect.');
    }
    control.dispose();
    handedOff = true;
    console.log(JSON.stringify(connectionResult(remote)));
    console.error('Keep this command running while using the host. Ctrl+C releases its SSH attach.');
    const result = await alive;
    if (!stopping) throw new Error(`SSH keepalive ended (${result.signal || result.code}). Run connect again before reopening the host.`);
  } finally {
    if (!handedOff) control.cancel();
    keepalive?.kill();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    if (stopping) process.exitCode = 130;
  }
}

if (require.main === module) main().catch(error => {
  console.error(error?.code?.startsWith('ERR_PARSE_ARGS') ? 'Invalid arguments. Use --help for usage.' : error.message);
  process.exitCode = error.name === 'CancellationError' ? 130 : 1;
});
module.exports = { selectServer, connectionResult, probeSsh };
