# Use Node.js on Debian Bookworm (avoids outdated security archive 404s)
FROM node:18-bookworm

# Install system dependencies: Ruby, Python3, and build essentials cleanly
RUN apt-get update && apt-get install -y \
    ruby-full \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside container
WORKDIR /app

# Copy package dependency manifests
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 3000 for Express
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
