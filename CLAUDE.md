# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A NestJS (TypeScript) service that runs as a container alongside a Docker Compose stack. It reads DNS definitions from labels on other containers and syncs them to DNS providers on an interval.
Limited DNS record types are supported as well as DNS providers.

The README documents the user-facing behaviour: environment variables, label format and examples.

Read the README as it contains details of what record types and DNS providers are supported.

You'll find a lot of classes named "Cloudflare" within it.
The solution as of 28th September 2026 version 1.3.0 and earlier and possibly later is hardcoded to Cloudflare.
The intent is to move away from this in future versions.

## Commands

The package manager is yarn (`yarn.lock`).

- Build: `yarn build` (compiles to `dist/`)
- Run locally: `yarn start:dev` (needs `API_TOKEN` or `API_TOKEN_FILE` in the environment, plus access to the Docker socket)
- Lint (auto-fixes): `yarn lint`. Uses airbnb-base + airbnb-typescript + prettier (single quotes, trailing commas).
- Format: `yarn format`
- Unit tests: `yarn test`. These are `src/**/*.spec.ts`, with Jest `rootDir` set to `src`.
- Single unit test file: `yarn test cloud-flare.service` (Jest path pattern), or add `-t "<test name>"`
- Coverage: `yarn test:cov`
- E2E tests: `yarn test:e2e`. These are `test/**/*.e2e-spec.ts`, configured by `test/jest-e2e.json`. They run in band and **need a running Docker daemon** because they use `testcontainers` to start real containers with labels. `test/.jest/setEnvVars.ts` sets a dummy `API_TOKEN`.

CI (`.github/workflows/ci.yaml`) builds the Dockerfile's `tests` target for both amd64 and arm64. That target runs `test:ci` during the build, then runs `test:e2e:ci` with the host's Docker socket mounted. JUnit and cobertura reports go to `reports/`.

CD (`.github/workflows/cd.yaml`) builds the Dockerfile's `production` target for both amd64 and arm64. That target does a production build of the source, then copies the compiled assets to a fresh node lts base. It computes a new version number using semantic versioning based on `git describe` and computes tags for the image. Using `latest`, `x-latest`, `x.x.x` or `x.x.x-x-xxxxxx`. `latest` and `x-latest` are used if publishing a new major, minor or patch version. `latest` is applied if the new Semver is the largest ever released. `x-latest` is used is the version is the largest of that major version ever released, where x is the major version number. `x.x.x` is used if the release is a new major, minor or patch always. `x.x.x-x-xxxxxx` is used if the publish is an alpha, beta or temporary release of a specific commit, `x.x.x` is the semver the change is based on, `-x-` is how many commits added since the semver and `-xxxxxx` is the short commit SHA that created the build; it is the output from `git describe`. The script that computes the Semver is powershell and in the cd.yaml file.

## Architecture

`main.ts` creates a NestJS **application context** (not an HTTP server). It calls `AppService.initialize()` and then `start()`.

**Sync loop**

- `CronService` (`src/cron/`) is an abstract base class. It runs `job()` once immediately, then repeats it with `setTimeout` every `ExecutionFrequencySeconds`.
- `AppService` and `DdnsService` both extend it.
- `AppService.job()` is the core pipeline:
  1. Fetch the DNS provider zones, then fetch each zone's records. The records are filtered to those whose `comment` exactly equals `ENTRY_IDENTIFIER`.
  2. Fetch the Docker containers and parse their labels into DTOs (`DockerService.extractDNSEntries`).
  3. If any A record has `address: "DDNS"`, start `DdnsService`. It polls `https://ipinfo.io` every `DDNS_EXECUTION_FREQUENCY_MINUTES`. Its IP replaces `DDNS` in those entries; until an IP is known, the DDNS entries are dropped. When no entries need DDNS any more, the service is stopped.
  4. Map the CloudFlare records to `*CloudflareEntry` DTOs (`CloudFlareService.mapDNSEntries`).
  5. `computeSetDifference` (`app.functions.ts`) matches entries by `Key` (`${type}-${name}`) and splits them into add, update, delete and unchanged. It uses `hasSameValue` to decide whether a matched entry needs an update.
  6. Create, update and delete records through `CloudFlareFactory`, which builds the request params and always sets `comment` to `ENTRY_IDENTIFIER`.

**Ownership model:** the DNS services record comment `ENTRY_IDENTIFIER` (`${PROJECT_LABEL}:${INSTANCE_ID}`) decides which records this instance owns. The same string is the Docker label key the service reads. Any record carrying that comment that isn't in the Docker labels gets deleted, including unsupported record types (mapped to `DnsUnsupportedCloudFlareEntry`). Using different `INSTANCE_ID`s lets several instances run side by side.

**DTOs (`src/dto/`)**

- `DnsbaseEntry` is the abstract base: `type`, `name`, `Key`, `hasSameValue`.
- `DnsbaseCloudflareProxyEntry` adds `proxy`, which A and CNAME records use.
- Each record type has an `XxxEntry` class (the Docker-sourced shape, validated with `class-validator`), an `isDnsXxxEntry` type guard, and an `XxxCloudflareEntry` subclass that adds `id` and `zoneId`.
- `src/validators/` holds custom validators, such as the IP-or-`DDNS` check.
- Adding a record type means touching: the `DNSTypes` enum, a new DTO pair, the `DockerService` label parsing switch, `CloudFlareService.mapDNSEntries`, a `CloudFlareFactory` params method and `AppService.getCloudFlareRecordParameters`.

**Configuration (`app.configuration.ts`)**

- Environment variables are validated with a Joi schema through `@nestjs/config`. There is no `.env` file.
- `API_TOKEN` and `API_TOKEN_FILE` are mutually exclusive (xor). `API_TOKEN_FILE` must be under `/run/secrets/`; it is read at load time and its contents become `API_TOKEN`.
- The config module is imported dynamically in `main.ts` and in the e2e tests, not in `AppModule`.

**Factories:** `DockerFactory` and `CloudFlareFactory` wrap the construction of the `dockerode` and `cloudflare` SDK clients so the services can be unit tested with mocks.

**Conventions**

- Classes use `getLogClassDecorator` (`utility.functions.ts`, built on `logger-decorator`) for trace logging, via a module-level `loggerPointer` that the constructor assigns.
- Errors are wrapped in `NestedError`.
- Error messages are prefixed with `ClassName, methodName:`.
- Spec files reach into private members with bracket notation (`sut['field']`); the `dot-notation` lint rule is disabled for specs.
- Some spec files export fixtures (for example `validDnsAEntry` in `dnsa-entry.spec.ts`) that other tests import.

## Feature workflow (BDD/TDD)

Feature work starts from a story with acceptance criteria, followed by UML (component or class diagrams, usually from draw.io). Work in this order and don't skip ahead to implementation:

1. Scaffold the new classes as stubs.
2. Write e2e tests (`test/*.e2e-spec.ts`) that cover each acceptance criterion explicitly, including failure modes, edge cases and corner cases.
3. Write unit tests (`src/**/*.spec.ts`) from the UML, covering every happy path and failure mode.
4. Implement the behaviour to make the tests pass.

If the story or diagrams are ambiguous, ask rather than guess.

## Definition of done

Every change and PR must keep the standard the project is already written to:

- **Lint:** zero errors and zero warnings, using the no-fix `eslint ... --max-warnings 0` command above. CI does not run lint, so check it locally.
- **Tests:** all unit tests and all e2e tests pass. The e2e tests need Docker.
- **Coverage:** no drop from the current level. The Jest config has no threshold, so compare against the baseline. As of September 2026 the baseline is about 94% statements, functions and lines, and about 88% branches.
- Report the actual results of these checks, including any failures.

Don't change the CI pipeline (`.github/workflows/`) or the git hooks setup (husky, `core.hooksPath`) unless explicitly asked.
