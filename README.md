# FairJournal Backend

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
