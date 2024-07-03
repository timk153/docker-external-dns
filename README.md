# Docker compose external DNS

This project was built using:<br/>
[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

This project does the following:

- Reads labels from containers sharing the same docker runtime.<br/>
  The labels contain DNS information.
- Synchronises those records to a DNS provider
- Runs at a regular interval (like a CRON job but interval is only programmable in seconds)
- Supports multiple instances running, one per DNS zone or Subscription
- Can only modify records (update / delete) that it created
- Supports the following record types only:
  - A
  - CNAME
  - MX
  - NS

Currently only CloudFlare is supported as it was designed for a personal project with no other providers catered for.

## Running locally

### Installation

```bash
$ yarn install
```

### Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

### Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Integration, Deployment and Consuming

The project deploys a docker image to docker hub.

### Integration

The main branch is protected, such that:

- Changes must be made by pull request
- Branches must Squah to main
- No linting or format warnings or errors are permitted
- All unit and integration tests must pass
- Sufficient code coverage must be present (80%)
- Docker image must build successfully
- Must be linked to an issue

Only once all of these occur can a pull request be completed.<br/>
You should only address ONE issue per branch.<br/>
If you want to address more than one, do them sequentially on their own branches.

### Deployment

- Occurs automatically when a Tag is created from main.
- The docker image is built to production stage
- Image is pushed to docker hub, project is tkilminster.<br/>
  Tag is docker-compose-external-dns-{version}.</br>
  {version} = `git describe`<br/>
  `git describe` = outputs semantic version based on tag e.g. v1.0.1
- Can be ran on a feature branch to generate a non-production image.<br/>
  This allows you to deploy a feature branch with docker-compose to an environment.
- Can be ran on main after squashing a feature branch without a new tag.<br/>
  Like running against a feature branch, you could deploy this image and test it before making a new tag.

### Consuming

To consume the project, a person would reference the image in their docker-compose file, provide the appropriate environment variables and add labels to their services.

## License

This project is personal, but uses NEST.<br/>
Nest is [MIT licensed](LICENSE).
