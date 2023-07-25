# File System Gateway

This repository contains the server-side implementation of our decentralized file system gateway. It's designed to provide a public, uncensored file system that can be accessed via the web for individuals wanting to share their data. The backend interfaces with multiple decentralized storage platforms and provides key services to manage data effectively and securely.

## Features

1. **Mempool:** Holds user operations on their file systems before they're included in the smart contract and uploaded to storage.

2. **Gateway:** Manages data uploads to storage through public gateways, eliminating the need for users to install nodes/extensions. This component can be replaced in projects using other file gateways.

3. **Rollup:** Aggregates all user changes over a specific period into a single hash, stored in a smart contract at regular intervals. This method significantly reduces the traditionally high costs associated with smart contract modifications, potentially saving users a substantial amount of money.

4. **Appchains:** The combination of the backend and file system allows services to build Appchains for data storage. As the project evolves, these data Appchains will be interconnected in a decentralized manner.

The server-side implementation is designed to work seamlessly with our [Decentralized File System](https://github.com/FairJournal/file-system), providing an end-to-end solution for creating a public, decentralized file system.

## API

### GET /v1/fs/user/info

This endpoint checks if a user exists in the file system.

**URL parameters:**

- `address`: The address of the user.

**Response:**

```json
{
  "status": "ok",
  "address": "<address>",
  "isUserExists": "<boolean>"
}
```

---

## GET /v1/fs/user/get-update-id

This endpoint gets the current update ID for a user.

**URL parameters:**

- `address`: The address of the user.

**Response:**

```json
{
  "status": "ok",
  "address": "<address>",
  "updateId": "<number>"
}
```

---

### POST /v1/fs/blob/upload

This endpoint handles the uploading of a file, uploads it to the storage, inserts its metadata into a cache database to speed up the gateway, and returns the file info.

**Form data:**

- `blob`: A file to upload.

**Response:**

```json
{
  "status": "ok",
  "data": {
    "reference": "<reference>",
    "mime_type": "<mime_type>",
    "sha256": "<sha256>",
    "size": "<size>"
  }
}

```

---

### GET /v1/fs/blob/get-article

This endpoint retrieves a full article based on the user's address and the article's slug.

**URL parameters:**

- `userAddress`: The address of the user.
- `slug`: The slug of the article.

**Response:**

```json
{
  "status": "ok",
  "userAddress": "<userAddress>",
  "article": {
    "slug": "<slug>",
    "data": "<data>"
  }
}

```

---

### GET /v1/fs/blob/get-articles

This endpoint retrieves all the articles of a user.

**URL parameters:**

- `userAddress`: The address of the user.

**Response:**

```json
{
  "status": "ok",
  "userAddress": "<userAddress>",
  "articles": [
    {
      "slug": "<slug>",
      "data": "<data>"
    },
    // ... more articles
  ]
}

```

---

### GET /v1/fs/blob/get-path-info

This endpoint retrieves the info of a specific path for a user.

**URL parameters:**

- `userAddress`: The address of the user.
- `path`: The path to retrieve info for.

**Response:**

```json
{
  "status": "ok",
  "userAddress": "<userAddress>",
  "path": "<path>",
  "data": "<data>"
}
```

---

### POST /v1/fs/update/apply

This endpoint applies an update action to the file system.

**Form data:**

- An `update` object that includes the update data.

**Response:**

```json
{
  "status": "ok"
}
```

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

Test app using local Docker

`docker build -t your-docker-image-name . && docker run -p 8000:8000 your-docker-image-name`