# AEVE - Advanced Email Verification Engine

AEVE is a Node.js email verification engine designed to assess email address quality using syntax validation, domain checks, DNS mail-routing checks, and local detection systems.

## Features

- Email normalization and syntax validation.
- Domain existence checks using DNS.
- MX record and implicit mail-routing detection.
- Disposable email domain detection.
- Role-based email detection.
- Email provider identification.
- Preliminary email scoring.
- Bulk email verification with duplicate removal and controlled concurrency.
- Result caching.
- Optional SMTP server connection diagnostics.

## Important Verification Limitations

AEVE currently performs syntax, domain, and mail-routing checks. It does not confirm that an individual mailbox exists or can receive messages.

A successful SMTP greeting confirms that a mail server responds, not that a particular email address is valid.

SMTP diagnostics are optional and are not automatically run during bulk verification.

## Requirements

- Node.js
- npm

## Installation

```bash
npm install
```

## Run Tests

```bash
npm test
```

## Basic Usage

```js
import { verifyEmail, verifyBulk } from './src/index.js';

const singleResult = await verifyEmail('example@gmail.com');
console.log(singleResult);

const bulkResult = await verifyBulk([
  'example@gmail.com',
  'contact@example.org',
  'invalid-email'
]);

console.log(bulkResult.summary);
```

## Optional SMTP Diagnostics

```js
import { verifyEmail } from './src/index.js';

const result = await verifyEmail('example@gmail.com', {
  includeSMTP: true
});

console.log(result.smtpDiagnostics);
```

SMTP diagnostics only check the mail server connection and greeting. They do not verify individual mailboxes.

## Technology Stack

- Node.js
- JavaScript (ES Modules)
- DNS and TCP networking
- validator
- tldts
- p-limit

## Project Status

AEVE is under active development. Its verification results are preliminary and should not be interpreted as proof of mailbox existence or email deliverability.