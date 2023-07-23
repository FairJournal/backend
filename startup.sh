#!/bin/sh

# Create .env file
cat > .env << EOF
# Path to the root of the files
FILES_ROOT_PATH=/app

# Port of the application
PORT=5000

DB_SOCKET_PATH=/run/mysqld/mysqld2.sock

# Database host
DB_HOST=localhost

# Database port
DB_PORT=3306

# Database username
DB_USER=fjuser

# Database password
DB_PASSWORD=fjpassword

# Database name
DB_NAME=fair_journal

# External web url for old files
URL=http://localhost:5000/

# Is show server logs
SHOW_LOGS=true

# Ton Storage CLI binary path
# This path should reflect the path inside the Docker container
TON_STORAGE_BIN_PATH=/app/ton/storage-daemon-cli-linux-arm64

# Ton Storage host
TON_STORAGE_HOST=localhost:5555

# Ton Storage database path
# This path should reflect the path inside the Docker container
TON_STORAGE_DATABASE_PATH=/app/ton/storage-db

# Ton Storage timeout
TON_STORAGE_TIMEOUT=5000

# Ton Storage wait attempts
TON_STORAGE_WAIT_ATTEMPTS=3

# Ton Storage check wait timeout
TON_STORAGE_CHECK_WAIT_TIMEOUT=1000
EOF

/app/ton/storage-daemon-linux-arm64 -v 5 -C /app/ton/global.config.json -I localhost:3333 -p 5555 -D /app/ton/storage-db >/dev/null 2>&1 &
/usr/bin/mysqld --user=mysql --socket=/run/mysqld/mysqld2.sock &
sleep 5 &&
mysql --socket=/run/mysqld/mysqld2.sock -uroot -e "source ./migrations/db.sql" &&
mysql --socket=/run/mysqld/mysqld2.sock -uroot -e "CREATE USER 'fjuser'@'localhost' IDENTIFIED BY 'fjpassword';" &&
mysql --socket=/run/mysqld/mysqld2.sock -uroot -e "GRANT ALL ON fair_journal.* TO 'fjuser'@'localhost';" &&
npx knex migrate:latest --env docker &&
npm run test
