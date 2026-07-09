# Build stage - optimized for low memory
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies first (separate layer)
RUN npm ci --production=false

# Copy all source files (separate layer)
COPY . .

# Build the application (separate layer)
RUN npm run build

# Prune production dependencies (separate layer)
RUN npm prune --omit=dev

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
