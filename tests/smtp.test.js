
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

import { checkSMTPConnection } from '../src/detectors/smtp.js';

test('rejects an invalid SMTP hostname', async () => {
  const result = await checkSMTPConnection('');

  assert.equal(result.available, false);
  assert.equal(result.status, 'invalid_input');
  assert.equal(result.host, null);
});

test('rejects a non-string SMTP hostname', async () => {
  const result = await checkSMTPConnection(null);

  assert.equal(result.available, false);
  assert.equal(result.status, 'invalid_input');
});

test('recognizes a successful SMTP greeting', async () => {
  const server = net.createServer(socket => {
    socket.write('220 test.local ESMTP\r\n');
  });

  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;

  try {
    const result = await checkSMTPConnection('127.0.0.1', {
      port,
      timeout: 2000
    });

    assert.equal(result.available, true);
    assert.equal(result.status, 'connected');
    assert.equal(result.responseCode, 220);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('rejects an unexpected SMTP greeting', async () => {
  const server = net.createServer(socket => {
    socket.write('554 Service unavailable\r\n');
  });

  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;

  try {
    const result = await checkSMTPConnection('127.0.0.1', {
      port,
      timeout: 2000
    });

    assert.equal(result.available, false);
    assert.equal(result.status, 'unexpected_response');
    assert.equal(result.responseCode, 554);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('handles an SMTP connection timeout', async () => {
  const server = net.createServer(() => {
    // Deliberately do not send an SMTP greeting.
  });

  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;

  try {
    const result = await checkSMTPConnection('127.0.0.1', {
      port,
      timeout: 200
    });

    assert.equal(result.available, false);
    assert.equal(result.status, 'timeout');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('recognizes a multiline SMTP greeting', async () => {
  const server = net.createServer(socket => {
    socket.write(
      '220-test.local ESMTP\r\n' +
      '220 Ready to receive connections\r\n'
    );
  });

  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;

  try {
    const result = await checkSMTPConnection('127.0.0.1', {
      port,
      timeout: 2000
    });

    assert.equal(result.available, true);
    assert.equal(result.status, 'connected');
    assert.equal(result.responseCode, 220);
    assert.equal(result.response.split('\r\n').length, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('handles an SMTP greeting split across TCP data events', async () => {
  const server = net.createServer(socket => {
    socket.write('220-test.local ESMTP\r\n');

    setTimeout(() => {
      socket.write('220 Ready to receive connections\r\n');
    }, 100);
  });

  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;

  try {
    const result = await checkSMTPConnection('127.0.0.1', {
      port,
      timeout: 2000
    });

    assert.equal(result.available, true);
    assert.equal(result.status, 'connected');
    assert.equal(result.responseCode, 220);
    assert.equal(result.response.split('\r\n').length, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
