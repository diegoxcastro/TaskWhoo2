# Stage 1: Builder
FROM node:20-slim as builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json /app/

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (both client and server)
RUN npm run build

# Stage 2: Runner
FROM node:20-slim

WORKDIR /app

# Copy package.json and package-lock.json again for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm install

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Command to run the application in production
CMD ["npm", "start"]
