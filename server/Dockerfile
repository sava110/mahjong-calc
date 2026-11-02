# Room API server. Build from the repository root:
#   docker build -f server/Dockerfile -t mahjong-calc-api .
# Runs the TypeScript sources directly with Node.js 24 (no build step, no
# npm dependencies).
FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY server/*.ts ./server/
COPY src/lib/room/types.ts src/lib/room/ops.ts ./src/lib/room/
RUN rm server/*.test.ts && mkdir /data && chown node:node /data
ENV PORT=8787 DB_PATH=/data/rooms.db
VOLUME /data
USER node
EXPOSE 8787
CMD ["node", "server/index.ts"]
