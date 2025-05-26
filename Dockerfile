# Get node image needed for development & building
FROM node:lts-alpine AS base

# Install
FROM base AS install
WORKDIR /app
COPY ["package.json", "yarn.lock", "/app/"]
RUN yarn install && \
  yarn cache clean
COPY . .

# Executed to run tests in the container
FROM install AS tests
RUN apk update && apk add docker-cli && apk add acl
RUN yarn run test:ci
RUN setfacl -R -m u:node:rwx reports
USER node
CMD ["yarn", "run", "test:e2e:ci"]

# Build
FROM install AS build
RUN yarn run build
WORKDIR /app/dist
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install --production

FROM scratch AS build-results
WORKDIR /
COPY --from=build /app/dist .

# Production
FROM base AS production
COPY --from=build-results . /home/node/app
WORKDIR /home/node/app
ENV NODE_ENV=production
EXPOSE 80
ENTRYPOINT ["node", "main.js"]