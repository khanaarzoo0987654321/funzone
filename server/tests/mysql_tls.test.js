import test from 'node:test';
import assert from 'node:assert/strict';

import { env } from '../src/config/env.js';
import { buildMysqlConnectionConfig } from '../src/db/mysqlStore.js';

const base = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  ssl: false,
  sslCa: '',
};

test('MySQL pool config is unchanged when TLS is disabled', () => {
  const config = buildMysqlConnectionConfig(base);
  assert.deepEqual(config, {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    charset: 'utf8mb4',
    namedPlaceholders: true,
    waitForConnections: true,
    connectionLimit: 10,
  });
  assert.equal('ssl' in config, false, 'no ssl key is passed to mysql2 by default');
});

test('DB_SSL_CA is ignored when DB_SSL is disabled', () => {
  const config = buildMysqlConnectionConfig({ ...base, sslCa: 'unused-ca' });
  assert.equal('ssl' in config, false);
});

test('DB_SSL enables TLS without embedding any certificate', () => {
  const config = buildMysqlConnectionConfig({ ...base, ssl: true });
  assert.deepEqual(config.ssl, {});
  assert.equal(config.password, '');
});

test('DB_SSL_CA is passed into TLS options only when TLS is enabled', () => {
  const ca = 'provider-ca-placeholder-value';
  const config = buildMysqlConnectionConfig({ ...base, ssl: true, sslCa: ca });
  assert.deepEqual(config.ssl, { ca });
  assert.equal(config.ssl.ca, ca);
});

test('environment exposes opt-in TLS settings with safe defaults', () => {
  assert.equal(typeof env.db.ssl, 'boolean');
  assert.equal(typeof env.db.sslCa, 'string');
});
