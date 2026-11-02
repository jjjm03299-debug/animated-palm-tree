# Use official Node.js image on Debian Bullseye (allows apt-get root privileges)
FROM node:18-bullseye

# Install system dependencies: Ruby, Python3, and build essentials
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
