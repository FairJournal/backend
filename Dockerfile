# Dockerfile
FROM ubuntu:latest

# Install dependencies
RUN apt-get update && apt-get install -y curl

# Download and install TON Storage and CLI
RUN curl -LJO https://github.com/ton-blockchain/ton/releases/download/v2023.06/storage-daemon-linux-arm64 && chmod +x ./storage-daemon-linux-arm64
RUN curl -LJO https://github.com/ton-blockchain/ton/releases/download/v2023.06/storage-daemon-cli-linux-arm64 && chmod +x ./storage-daemon-cli-linux-arm64

# Download global config
RUN curl -LJO https://ton-blockchain.github.io/global.config.json

# Start TON Storage and CLI
CMD ["./storage-daemon-linux-arm64", "-v", "6", "-C", "global.config.json", "-I", "127.0.0.1:3333", "-p", "5555", "-D", "storage-db"]
CMD ["./storage-daemon-cli-linux-arm64", "-I", "127.0.0.1:5555", "-k", "storage-db/cli-keys/client", "-p", "storage-db/cli-keys/server.pub"]

# Run your app
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3333
CMD ["npm", "start"]
