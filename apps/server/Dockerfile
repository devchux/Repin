ARG NODE_VERSION=24-slim

# Use the official Node.js image as the base image
FROM node:${NODE_VERSION}

# Set the working directory inside the container
WORKDIR /usr/src/app

RUN corepack enable pnpm

# Copy workspace manifests first for better dependency layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

# Install the server and its workspace dependencies
RUN pnpm install --filter server... --frozen-lockfile

# Copy the source files needed by the server build
COPY apps/server apps/server
COPY packages/typescript-config packages/typescript-config

WORKDIR /usr/src/app/apps/server

# Build the NestJS application
RUN pnpm run build

# Expose the application port
EXPOSE 3001

# Run migrations before starting the application
CMD ["pnpm", "run", "start:migrate"]
