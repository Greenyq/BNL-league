# Local development image for the main Node/Express app.
# This Dockerfile is intended for local Docker Compose usage, not production deployment.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY backend ./backend
COPY frontend ./frontend
COPY uploads ./uploads
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]
