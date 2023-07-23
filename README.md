# File System Gateway

This repository contains the server-side implementation of our decentralized file system gateway. It's designed to provide a public, uncensored file system that can be accessed via the web for individuals wanting to share their data. The backend interfaces with multiple decentralized storage platforms and provides key services to manage data effectively and securely.

## Features

1. **Mempool:** Holds user operations on their file systems before they're included in the smart contract and uploaded to storage.

2. **Gateway:** Manages data uploads to storage through public gateways, eliminating the need for users to install nodes/extensions. This component can be replaced in projects using other file gateways.

3. **Rollup:** Aggregates all user changes over a specific period into a single hash, stored in a smart contract at regular intervals. This method significantly reduces the traditionally high costs associated with smart contract modifications, potentially saving users a substantial amount of money.

4. **Appchains:** The combination of the backend and file system allows services to build Appchains for data storage. As the project evolves, these data Appchains will be interconnected in a decentralized manner.

The server-side implementation is designed to work seamlessly with our [Decentralized File System](https://github.com/FairJournal/file-system), providing an end-to-end solution for creating a public, decentralized file system.

## Installation

1 - Install dependencies (Node.js 16):

`npm ci`

Copy and change options

`cp example.env .env`

2 - Install MySQL.

3 - Create `fair_journal` db:

`mysql -u root -p < ./migrations/db.sql`

4 - Start interactive mode for MySQL user creation:

`mysql -u root`

and run commands:

`CREATE USER 'fjuser'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';`

`GRANT ALL PRIVILEGES ON fair_journal.* TO 'fjuser'@'localhost';`

`FLUSH PRIVILEGES;`

5 - Put these credentials to `.env` file.

6 - Run migrations:

`npx knex migrate:latest --env production`

7 - Start server using pm2:

`npm run start`

## Development

Start in dev mode

`start:dev`
