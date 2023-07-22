# Start from the latest LTS Node version built for arm64 on Alpine
FROM node:alpine

# Add the TON Storage daemon and CLI to the path
ENV PATH="/app/ton:${PATH}"

WORKDIR /app

# Install necessary packages
# netcat equivalent in Alpine is netcat-openbsd
# curl is added since it might not be present in Alpine by default
RUN apk add --no-cache curl netcat-openbsd

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

# Add wait-for-it script and give it execute permissions
ADD wait-for-it.sh /app/wait-for-it.sh
RUN chmod +x /app/wait-for-it.sh

# Run the tests
CMD /app/wait-for-it.sh db:3306 -- npm run test
