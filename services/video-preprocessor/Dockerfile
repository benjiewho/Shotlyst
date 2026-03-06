# Preprocessor service: ffmpeg + Node. Used to detect candidate highlight windows
# so Convex sends only short segments to Gemini (reduces timeout and cost).
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install && npm run build
ENV NODE_ENV=production
EXPOSE 3080
CMD ["node", "dist/index.js"]
