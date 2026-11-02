
import net from 'node:net';

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_PORT = 25;
const MAX_RESPONSE_SIZE = 8192;

export function checkSMTPConnection(host, options = {}) {
  return new Promise(resolve => {
    const port = options?.port ?? DEFAULT_PORT;
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    if (
      typeof host !== 'string' ||
      !host.trim() ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !Number.isFinite(timeout) ||
      timeout <= 0
    ) {
      resolve({
        available: false,
        status: 'invalid_input',
        host: typeof host === 'string' ? host.trim() || null : null,
        responseCode: null,
        response: null,
        error: 'A valid hostname, port and timeout are required.'
      });

      return;
    }

    const normalizedHost = host.trim();
    const socket = new net.Socket();

    let completed = false;
    let responseBuffer = '';
    let responseLines = [];
    let expectedCode = null;

    function finish(result) {
      if (completed) return;

      completed = true;
      socket.destroy();

      resolve({
        host: normalizedHost,
        ...result
      });
    }

    function processResponse() {
      while (responseBuffer.includes('\r\n')) {
        const lineEnd = responseBuffer.indexOf('\r\n');
        const line = responseBuffer.slice(0, lineEnd);

        responseBuffer = responseBuffer.slice(lineEnd + 2);

        const match = line.match(/^(\d{3})([- ])(.*)$/);

        if (!match) {
          finish({
            available: false,
            status: 'unexpected_response',
            responseCode: null,
            response: [...responseLines, line].join('\r\n'),
            error: 'SMTP server returned a malformed greeting.'
          });

          return;
        }

        const [, code, separator] = match;
        const numericCode = Number(code);

        if (responseLines.length === 0) {
          expectedCode = numericCode;
        } else if (numericCode !== expectedCode) {
          finish({
            available: false,
            status: 'unexpected_response',
            responseCode: numericCode,
            response: [...responseLines, line].join('\r\n'),
            error: 'SMTP multiline response contained inconsistent status codes.'
          });

          return;
        }

        responseLines.push(line);

        if (responseLines.join('\r\n').length > MAX_RESPONSE_SIZE) {
          finish({
            available: false,
            status: 'unexpected_response',
            responseCode: expectedCode,
            response: null,
            error: 'SMTP greeting exceeded the maximum response size.'
          });

          return;
        }

        // A hyphen means another response line is expected.
        if (separator === '-') {
          continue;
        }

        const response = responseLines.join('\r\n');

        if (expectedCode === 220) {
          finish({
            available: true,
            status: 'connected',
            responseCode: 220,
            response,
            error: null
          });
        } else {
          finish({
            available: false,
            status: 'unexpected_response',
            responseCode: expectedCode,
            response,
            error: 'SMTP server returned an unexpected greeting.'
          });
        }

        return;
      }

      if (responseBuffer.length > MAX_RESPONSE_SIZE) {
        finish({
          available: false,
          status: 'unexpected_response',
          responseCode: expectedCode,
          response: null,
          error: 'SMTP greeting exceeded the maximum response size.'
        });
      }
    }

    socket.setTimeout(timeout);

    socket.on('data', data => {
      responseBuffer += data.toString('utf8');
      processResponse();
    });

    socket.once('timeout', () => {
      finish({
        available: false,
        status: 'timeout',
        responseCode: null,
        response: responseLines.length
          ? responseLines.join('\r\n')
          : null,
        error: 'SMTP connection timed out.'
      });
    });

    socket.once('error', error => {
      finish({
        available: false,
        status: 'connection_error',
        responseCode: null,
        response: null,
        error: {
          code: error.code || 'UNKNOWN',
          message: error.message
        }
      });
    });

    socket.once('close', () => {
      if (!completed) {
        finish({
          available: false,
          status: 'connection_closed',
          responseCode: null,
          response: responseLines.length
            ? responseLines.join('\r\n')
            : null,
          error: 'SMTP connection closed before the greeting was completed.'
        });
      }
    });

    socket.connect(port, normalizedHost);
  });
}
