'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectServer, connectionResult } = require('../scripts/remote');

test('selection preserves opaque IDs and rejects duplicate labels', () => {
  const servers = [{ id: '["opaque","one"]', label: 'Cloudnet' }, { id: 'two', label: 'cloudnet' }];
  assert.throws(() => selectServer(servers, { server: 'cloudnet' }), /ambiguous/);
  assert.equal(selectServer(servers, { serverId: '["opaque","one"]' }).id, '["opaque","one"]');
  assert.throws(() => selectServer(servers, { server: 'missing' }), /missing/);
});

test('Codex link uses only the validated SSH alias, without session credentials', () => {
  const result = connectionResult({ sshHost: `tempest-${'a'.repeat(64)}`, sessionId: 'private-session' });
  const url = new URL(result.addHostUrl);
  assert.equal(url.hostname, 'settings');
  assert.equal(url.pathname, '/connections/ssh/add');
  assert.equal(url.searchParams.get('name'), result.sshHost);
  assert.equal(JSON.stringify(result).includes('private-session'), false);
});
