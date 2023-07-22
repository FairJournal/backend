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

# Install project dependencies
RUN npm ci

# Run scripts
RUN npm run check:types
RUN npm run lint:check

# Copy the startup script and make it executable
COPY ./startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

CMD ["/app/startup.sh"]
