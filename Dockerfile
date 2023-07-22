# Start from the latest LTS Node version built for arm64 on Alpine
FROM node:alpine

# Add the TON Storage daemon and CLI to the path
ENV PATH="/app/ton:${PATH}"

WORKDIR /app

# Install necessary packages
# netcat equivalent in Alpine is netcat-openbsd
# curl, mysql, and mysql-client are added since they might not be present in Alpine by default
RUN apk add --no-cache curl netcat-openbsd mysql mysql-client

# Initialize MySQL Database
RUN mysql_install_db --user=mysql --ldata=/var/lib/mysql

# Download TON Storage daemon and CLI binaries
RUN curl -LJO https://github.com/ton-blockchain/ton/releases/download/v2023.06/storage-daemon-linux-arm64
RUN curl -LJO https://github.com/ton-blockchain/ton/releases/download/v2023.06/storage-daemon-cli-linux-arm64

# Make them executable
RUN chmod +x storage-daemon-linux-arm64 storage-daemon-cli-linux-arm64

# Move them to the right place
RUN mkdir ton && mv storage-daemon-linux-arm64 storage-daemon-cli-linux-arm64 ton/

# Add the current directory content to the Docker image
ADD . /app

# Setup MySQL Database
RUN /usr/bin/mysqld --user=mysql & sleep 5 && \
    mysql -h 127.0.0.1 -uroot -e "source ./migrations/db.sql" && \
    mysql -h 127.0.0.1 -uroot -e "CREATE USER 'fjuser'@'%' IDENTIFIED BY 'fjpassword';" && \
    mysql -h 127.0.0.1 -uroot -e "GRANT ALL ON fair_journal.* TO 'fjuser'@'%';" && \
    mysql -h 127.0.0.1 -uroot -e "ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '';"

# Install project dependencies
RUN npm ci

# Run scripts
RUN npm run check:types
RUN npm run lint:check
RUN npx knex migrate:latest
CMD /usr/bin/mysqld --user=mysql & sleep 5 && npm run test
