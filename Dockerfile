FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm install
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001 RHTP_DB_PATH=/data/rhtp.db
COPY --from=build /app/package*.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/node_modules ./node_modules
VOLUME ["/data"]
EXPOSE 3001
CMD ["node", "server/src/index.js"]
