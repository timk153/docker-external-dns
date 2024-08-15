# Get node image needed for development & building
FROM node:lts-alpine as base

# Install
FROM base as install
WORKDIR /app
COPY ["package.json", "yarn.lock", "/app/"]
RUN yarn install && \
  yarn clean cache
COPY . .

# Executed to run tests in the container
FROM install as tests
RUN yarn run test:ci
CMD yarn run test:e2e:ci

# Build
FROM install as build
RUN yarn run build
WORKDIR /app/dist
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install --production

FROM scratch as build-results
WORKDIR /
COPY --from=build /app/dist .

# Production
FROM base as production
COPY --from=build-results . /home/node/app
WORKDIR /home/node/app
ENV NODE_ENV=production
EXPOSE 80
ENTRYPOINT ["node", "main.js"]