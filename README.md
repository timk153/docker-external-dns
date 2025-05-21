<meta name="google-site-verification" content="BxFtjK97fs8vIbZk_fUjQ96iyJRTzRkYnOcCMpUl2sk" />

![project-url][test-badge]
![project-url][coverage-badge]
![codacy-url][codacy-badge]

[codacy-badge]: https://app.codacy.com/project/badge/Grade/d43ba19e75954648b5f79ce6db8e8cc3
[codacy-url]: https://app.codacy.com/gh/timk153/docker-external-dns/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade
[project-url]: https://github.com/timk153/docker-external-dns
[test-badge]: https://img.shields.io/endpoint?url=https%3A%2F%2Fgist.githubusercontent.com%2Ftimk153%2F26bea053b867128f6f37f5aac0ddcf8b%2Fraw%2F32d61159849411189d88f349d141c28dac0cbbaf%2Fdocker-external-dns-junit-tests.json
[coverage-badge]: https://img.shields.io/endpoint?url=https%3A%2F%2Fgist.githubusercontent.com%2Ftimk153%2F26bea053b867128f6f37f5aac0ddcf8b%2Fraw%2Fcaa38e5f9bd95657bd1f4f9ac76f5447b627600f%2Fdocker-external-dns-cobertura-coverage.json

# Docker Compose external DNS (docker-external-dns)

This project was inspired by:
https://github.com/kubernetes-sigs/external-dns
https://github.com/dntsk/extdns

It is broadly similar to [extdns](https://github.com/dntsk/extdns) in functionality, but expands upon it.

This project was built using:<br/>
[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

This project does the following:

- Reads labels from containers sharing the same docker runtime.<br/>
  The labels contain DNS information.
- Optionally include stopped containers DNS entires
- Synchronises those records to CloudFlare
- Runs at a regular interval (like a CRON job but interval is only programmable in seconds)
- Supports DDNS (ipv4 only)
- Supports multiple instances with different configurations
- Writes identification comments to determine which records it controls
- Supports the following record types only:
  - A
  - CNAME
  - MX
  - NS

**IMPORTANT** Only CloudFlare is supported.

# User guide

## TL;DR

The project provides a Docker Compose external DNS container specifically for CloudFlare. It supports DNS entries of types A, CNAME, NS, and MX. Configuration is managed through environment variables and labels applied to Docker containers. Detailed examples for various configurations and DNS record types are provided in the [Examples](#examples) section. For more details on DNS record types, refer to the [DNS Entry Types](#dns-entry-types) section.

## Troubleshooting

### Hangs at startup

Check your supplied LOG_LEVEL.<br/>
Ensure it is one of: 'log', 'error', 'warn', 'debug', 'verbose', 'fatal'

If set to an invalid value the project will hand at start-up. I've tried to address this behavior unsuccessfully. For now awareness is the simplest solution.

## How to Use

Using the Docker Compose External DNS container is very straightforward. You need to declare an instance of it within your Docker Compose definition (docker-compose.y(a)ml) with the appropriate volume mount and environment variables set. Then, add some labels to your containers.

This file comprises the following sections:

- [Configuration](#configuration): All the configuration options available.
  - [Environment Variables](#environment-variables): All the variables that can be set and what they do.
  - [Labels](#labels): All the possible DNS entry types supported and how to use them.
- [Examples](#examples): Common configurations.

## Configuration

### Environment Variables

The container is configured via environment variables. The following table describes the variable name, its default value (if any), and what it does.
Detailed examples are available in the [Examples](#examples) section.

| Variable Name                    | Default Value               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PROJECT_LABEL                    | docker-compose-external-dns | Detailed example available in the [project Label and Instance ID section](#project_label-and-instance_id) section.<br/><br/>Forms part of the label the project looks for on Docker containers to interpret as DNS entries. Also written as a comment to Cloudflare DNS entries managed by this instance of the project.                                                                                                                                    |
| INSTANCE_ID                      | 1                           | Detailed example available in the [project Label and Instance ID section](#project_label-and-instance_id) section.<br/><br/>Forms part of the label the project looks for on Docker containers to interpret as DNS entries. Also written as a comment to Cloudflare DNS entries managed by this instance of the project.                                                                                                                                    |
| EXECUTION_FREQUENCY_SECONDS      | 60                          | How frequently the CRON job should execute to detect changes. Default is every 60 seconds. Undefined or empty uses the default. Minimum is every 1 second. There is no maximum. This must be an integer.                                                                                                                                                                                                                                                    |
| DDNS_EXECUTION_FREQUENCY_MINUTES | 60                          | Determines how frequently the DDNS Service checks for a new public IP address. This setting only applies if you're using DDNS otherwise the service will not be started.                                                                                                                                                                                                                                                                                    |
| PRESERVE_STOPPED                 | false                       | Determines if DNS entries for stopped containers are synchronised to the DNS server. `false` doesn't synchronise, meaning containers which are stopped will have their DNS entries removed. `true` means stopped containers won't have their entries removed. Removed containers will always have their DNS entries removed.                                                                                                                                |
| API_TOKEN                        |                             | You must supply either API_TOKEN or API_TOKEN_FILE but not both.<br/><br/>Your API token from Cloudflare. Must be granted Zone.Zone read and Zone.DNS edit.<br/><br/><span style="color: red; font-weight:bold">IMPORTANT</span> Use of this property is insecure as your API_TOKEN will be in plain text. It is recommended you use API_TOKEN_FILE. Use at your own risk.                                                                                  |
| API_TOKEN_FILE                   |                             | You must supply either API_TOKEN or API_TOKEN_FILE but not both.<br/><br/>Secure way to share your Cloudflare API Token with the project. Recommended approach for Docker Swarm. Compatible with Docker Compose (but less secure).<br/><br/>Read Docker Compose docs for more information: [Docker Compose Secrets](https://docs.docker.com/compose/use-secrets/)                                                                                           |
| LOG_LEVEL                        | error                       | The current logging level. The default is error, meaning only errors and fatal get logged.<br/><br/>Each level includes the levels above it from most specific to least specific. By way of example, verbose will output everything. debug will ignore verbose. log will ignore debug and verbose.<br/><br/>From most specific to least:</br>fatal<br/>error<br/>warn<br/>log<br/>debug<br/>verbose<br/><br/>These log levels come from the NestJS project. |

#### PROJECT_LABEL and INSTANCE_ID

These two items combine to form the label which the project will look for on Docker Containers and write as the comment for that DNS entry into Cloudflare.

It is interpolated as follows: `${PROJECT_ID}:${INSTANCE_ID}`<br/><br/>
For example:
|PROJECT_ID|INSTANCE_ID|EXAMPLE|Use Case|
|-|-|-|-|
|docker-compose-external-dns|1|docker-compose-external-dns:1|The default|
|docker-compose-external-dns|production|docker-compose-external-dns:production|Could be used to target a production Cloudflare subscription|
|docker-compose-external-dns|production|docker-compose-external-dns:non-production|Targets the non-production Cloudflare subscription|
|dns.com.mydomain|project|dns.com.mydomain:project|DNS entries for a specific subdomain of yours.

Please note, in a large deployment the project label and instance id will become cruitial to management.<br/>
For best practice, establish a naming convension and apply it consistently.

### Labels

The values of the Docker Compose labels correspond to DNS entries. You can find descriptions of the various DNS records here: [List of DNS Record Types](https://en.wikipedia.org/wiki/List_of_DNS_record_types).

Examples for all of these can be found in the [Examples](#examples) section below.
For more details on the DNS record types, refer to the [DNS Entry Types](#dns-entry-types) section.

#### A

The A record points a domain name to an IP address.  
<br/><br/>
name = example.com<br/>
server = 8.8.8.8<br/><br/>
Lookup of example.com returns 8.8.8.8<br/>

The properties required for this entry are as follows:

| property | value                                         | description                                                                                                                                                                                                                                                      |
| -------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| type     | A                                             | The type of the record. In this case it should be A                                                                                                                                                                                                              |
| name     | \<your domain name\>                          | This is the domain you want this A record to resolve for. For example: example-domain.com                                                                                                                                                                        |
| address  | \<your server's address (v4 or 6)\> OR "DDNS" | The address you want your domain name to resolve to.</br> Or the string literal "DDNS" which instructs the project to compute your current public ipv4 address and use it for this record.                                                                       |
| proxy    | true or false                                 | True uses Cloudflare's proxy to hide your address. False causes Cloudflare to act as a normal DNS server.<br/><br/>Documentation: [Proxied DNS Records](https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/#proxied-records) |

#### CNAME

The CNAME record aliases the name to another A or CNAME record. Causing the name when queried to resolve to the A record it (eventually) resolves to.  
<br/><br/>
type = A<br/>
name = example.com<br/>
server = 8.8.8.8<br/>
<br/>
type = CNAME<br/>
name = subdomain.example.com<br/>
target = example.com<br/>
<br/>
type = CNAME<br/>
name = lower.subdomain.example.com<br/>
target = subdomain.example.com<br/>
<br/>
Lookup of example.com returns 8.8.8.8<br/>
Lookup of subdomain.example.com returns 8.8.8.8<br/>
Lookup of lower.subdomain.example.com returns 8.8.8.8<br/>

The properties required for this entry are as follows:

| property | value                                  | description                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| type     | CNAME                                  | The type of the record. In this case it should be CNAME                                                                                                                                                                                                                                                                                                                                                                                                       |
| name     | \<your alias\>                         | This is the alias you want this CNAME record to resolve for. For example: subdomain.example-domain.com                                                                                                                                                                                                                                                                                                                                                        |
| target   | \<your full A record or CNAME record\> | The full name of the relevant A or CNAME record this should resolve to. For example, use 'example-domain.com' to point at the A record above.                                                                                                                                                                                                                                                                                                                 |
| proxy    | true or false                          | True uses Cloudflare's proxy to hide your address. False causes Cloudflare to act as a normal DNS server.<br/><br/>Documentation: [Proxied DNS Records](https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/#proxied-records)<br/><br/>Please note, only one level of subdomain can be proxied. If it's two subdomains deep (e.g. test.subdomain.example.com) it cannot be proxied unless you have a premium subscription. |

#### MX

The MX record declares that a mail server handles mail for your domain or subdomain. The name is the domain or subdomain it handles mail for. The server points to an A or CNAME which resolves to your mail server. It's common to make a CNAME record for the mail server for this entry to point to.  
<br/><br/>
type = A<br/>
name = example.com<br/>
server = 8.8.8.8<br/>
<br/>
type = CNAME<br/>
name = mx1.example.com<br/>
target = example.com<br/>
<br/>
type = MX<br/>
name = example.com<br/>
target = mx1.example.com<br/>
<br/>
Lookup of example.com returns 8.8.8.8<br/>
Lookup of mx1.example.com returns 8.8.8.8<br/>
Lookup of mail server for example.com returns 8.8.8.8<br/>

The properties required for this entry are as follows:

| property | value                            | description                                                                                                                                                           |
| -------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| type     | MX                               | The type of the record. In this case it should be MX                                                                                                                  |
| name     | \<your domain\>                  | This is the domain you want this mail server to handle mail for. For example: example-domain.com                                                                      |
| server   | \<full name of the mail server\> | The full name of the relevant A or CNAME entry this should resolve to. For example 'mx1.example-domain.com' (assuming you've made a CNAME or A record resolving mx1). |
| priority | 0 to 65535                       | The priority of this mail server, allowing you to have more than one mail server for a domain. Must be an integer between the stated values.                          |

#### NS

The NS record points a domain or subdomain name to an A or CNAME record. DNS queries that match that domain or subdomain are forwarded to the server. This is typically used to point traffic on a subdomain to another name server. Such as one only accessible within a private network.  
<br/><br/>
type = A<br/>
name = lan.example.com<br/>
server = 192.168.0.1<br/>
<br/>
type = NS<br/>
name = example.com<br/>
server = lan.example.com<br/>
<br/>
Lookup of example.com returns lan.example.com<br/>
Lookup of lan.example.com returns 192.168.0.1<br/>

The properties required for this entry are as follows:

| property | value                | description                                                                                                 |
| -------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| type     | NS                   | The type of the record. In this case it should be NS                                                        |
| name     | \<your domain name\> | This is the domain you want to forward queries for. For example: example-domain.com                         |
| server   | \<your server name\> | The full name of the relevant A or CNAME entry this should resolve to. For example 'lan.example-domain.com' |

## Docker Image Tags

There are four types of image tag associated with this project:

| tag                                         | example                                 | description                                                                                    |
| ------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| latest                                      | timk153/docker-external-dns:latest      | the latest release of the most recent major version                                            |
| \<major version number\>-latest             | timk153/docker-external-dns:1-latest    | the latest release of that major version. In the example it's the latest release of version 1. |
| semantic version number                     | timk153/docker-external-dns:1.4.2       | a specific release. In the example it's release 1.4.2                                          |
| semantic version with additional identifier | timk153/docker-external-dns:1.4.2-alpha | a alpha, beta or development build. In the example it's an alpha release of version 1.4.2.     |

All available tags can be found in the [docker hub public registry](https://hub.docker.com/repository/docker/timk153/docker-external-dns/tags).

## Examples

Below are a series of example configurations for the following usecases.
Please note, all examples use the image tagged with latest.

### Minimal configuration

#### API_TOKEN

This example demonstrates the most basic setup of the Docker Compose External DNS container with default values. It shows how to use the API_TOKEN environment variable and configure a single DNS entry.

<span style="color: red; font-weight: bold;">IMPORTANT</span> API_TOKEN is insecure, API_TOKEN_FILE is recommended

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[{ "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false }]'
```

Explanation: This setup includes the docker-compose-external-dns service configured with the API_TOKEN environment variable. It will use the token to authenticate with Cloudflare. The other-service has a label that specifies a DNS A record for my-domain.com pointing to 8.8.8.8 with no proxy.

#### API_TOKEN_FILE

This configuration demonstrates the preferred method of passing the API token securely using Docker secrets. This is more secure than using API_TOKEN.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN_FILE=/run/secrets/CLOUDFLARE_API_TOKEN
    secrets:
      - CLOUDFLARE_API_TOKEN
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[{ "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false }]'

secrets:
  CLOUDFLARE_API_TOKEN:
    environment: 'CLOUDFLARE_API_TOKEN'
```

Explanation: This setup uses Docker secrets to securely manage the Cloudflare API token. The API_TOKEN_FILE environment variable points to the secret file, which contains the API token. This approach is recommended for better security, especially in production environments.

### PRESERVE_STOPPED

This example demonstrates a configuration which preserves the DNS records for containers which become stopped.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
      - PRESERVE_STOPPED=true
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[{ "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false }]'
```

Explanation: This setup sets PRESERVE_STOPPED to true, meaning if other-service became stopped, the DNS entry would be preserved

### Bespoke label, instance id, frequency and log level

This example shows how to customize the label, instance ID, execution frequency, and log level settings.

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - PROJECT_LABEL=dns.com.example
      - INSTANCE_ID=project-subdomain
      - EXECUTION_FREQUENCY_SECONDS=120
      - LOG_LEVEL=info
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'dns.com.example:project-subdomain=[{ "type": "CNAME", "name": "project.example.com", "target": "example.com", "proxy": true }]'
```

Explanation: In this configuration:<br/>
<br/>
PROJECT_LABEL is set to dns.com.example, which is used as part of the label on Docker containers.<br/>
INSTANCE_ID is set to project-subdomain to differentiate this instance.<br/>
EXECUTION_FREQUENCY_SECONDS is set to 120, meaning the DNS updates will occur every 2 minutes.<br/>
LOG_LEVEL is set to info to log informational messages as well as warnings and errors.<br/>
The other-service has a CNAME record pointing project.example.com to example.com with proxy enabled.<br/>

### Two domains, one service

This example illustrates managing DNS entries for multiple domains using a single docker-compose-external-dns service.
Please note, your API_TOKEN(\_FILE) will require permissions for both domains.

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[
        { "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false },
        { "type": "A", "name": "my-other-domain.org", "address": "8.8.8.8", "proxy": true }]'
```

Explanation: This setup shows how to handle DNS records for two different domains (my-domain.com and my-other-domain.org) with one instance of docker-compose-external-dns. Each domain has its own A record configuration. The my-other-domain.org entry uses Cloudflare's proxy.

### Two domains, two services

These configurations demonstrates how to manage DNS records for different domains using separate docker-compose-external-dns services.

#### INSTANCE_ID

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns-1:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<api token for my-domain.com here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

docker-compose-external-dns-2:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - INSTANCE_ID=2
      - API_TOKEN=<api token for my-other-domain.org here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[{ "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false }]'
      - 'docker-compose-external-dns:2=[{ "type": "A", "name": "my-other-domain.org", "address": "8.8.8.8", "proxy": true }]'
```

Explanation: This setup uses two separate docker-compose-external-dns services to manage DNS entries for my-domain.com and my-other-domain.org. Each service is configured with its own API token and instance ID. This allows for independent management of DNS entries for each domain.

#### PROJECT_LABEL

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns-1:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - PROJECT_LABEL=dns.com.my-domain
      - API_TOKEN=<api token for my-domain.com here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

docker-compose-external-dns-2:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - PROJECT_LABEL=dns.org.my-other-domain
      - API_TOKEN=<api token for my-other-domain.org here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'dns.com.my-domain:1=[{ "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false }]'
      - 'dns.org.my-other-domain:1=[{ "type": "A", "name": "my-other-domain.org", "address": "8.8.8.8", "proxy": true }]'
```

Explanation: This setup uses two separate docker-compose-external-dns services to manage DNS entries for my-domain.com and my-other-domain.org. Each service is configured with its own API token and project label. This allows for independent management of DNS entries for each domain.

### DNS Entry types

The final set of examples demonstrates different types of DNS records (A, CNAME, NS, MX) and how to configure them using Docker Compose labels.
Please note, these labels may live on one or more services spead across one or more docker-compose files running on Docker. They are all on "other-service" in this instance for simplicity sake.

#### A

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[{ "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false }]'
```

Explanation: This example configures an A record for my-domain.com pointing to 8.8.8.8 without using Cloudflare's proxy.

##### DDNS Variant

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[{ "type": "A", "name": "my-domain.com", "address": "DDNS", "proxy": false }]'
```

Explanation: This example configures an A record for my-domain.com. The project will start the DDNS Service when this record is processed. The service will fetch your current public ipv4 address and use it for this record. The DDNS Service will check at regular intervals for a new ipv4 address. If one is detected then this record will be updated to the new value when the next DNS synchronisation interval is reached.

Settings to control interval are explained in the [configuration section](#configuration).

#### CNAME

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[
        { "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false },
        { "type": "CNAME", "name": "sub.my-domain.com", "target": "my-domain.com", "proxy": false }]'
```

Explanation: This setup includes a CNAME record that aliases sub.my-domain.com to my-domain.com, following the A record configuration for my-domain.com.

#### NS

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[
        { "type": "A", "name": "lan.my-domain.com", "address": "192.168.0.1", "proxy": false },
        { "type": "CNAME", "name": "ns1.lan.my-domain.com", "target": "lan.my-domain.com", "proxy": false },
        { "type": "NS", "name": "lan.my-domain.com", "server": "ns1.lan.my-domain.com" }]'
```

Explanation: This configuration includes an NS record specifying ns1.lan.my-domain.com as the nameserver for lan.my-domain.com, alongside an A record for lan.my-domain.com.

#### MX

<span style="color: red; font-weight: bold;">IMPORTANT</span> example uses insecure option "API_TOKEN" for simplicity.

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[
        { "type": "A", "name": "my-domain.com", "address": "8.8.8.8", "proxy": false },
        { "type": "CNAME", "name": "mx1.my-domain.com", "target": "my-domain.com", "proxy": false },
        { "type": "MX", "name": "my-domain.com", "server": "mx1.my-domain.com", "priority": 0 }]'
```

Explanation: This example sets up an MX record for my-domain.com that points to mx1.my-domain.com with a priority of 0. This is used to specify the mail server for the domain.

#### All together

```yaml
services:
  docker-compose-external-dns:
    image: 'timk153/docker-external-dns:latest'
    environment:
      - API_TOKEN=<your api token here>
    volumes:
      # Used to read labels from containers - readonly
      - '/var/run/docker.sock:/var/run/docker.sock:ro'

  other-service:
    image: 'busybox:latest'
    command: 'sleep 3600'
    labels:
      - 'docker-compose-external-dns:1=[
        { "type": "A", "name": "my-domain.com", "address": "DDNS", "proxy": false },
        { "type": "CNAME", "name": "mx1.my-domain.com", "target": "my-domain.com", "proxy": false },
        { "type": "MX", "name": "my-domain.com", "server": "mx1.my-domain.com", "priority": 0 },
        { "type": "CNAME", "name": "subdomain.my-domain.com", "target": "my-domain.com", "proxy": false },
        { "type": "A", "name": "lan.my-domain.com", "address": "192.168.0.1", "proxy": false },
        { "type": "CNAME", "name": "ns1.lan.my-domain.com", "target": "lan.my-domain.com", "proxy": false },
        { "type": "NS", "name": "lan.my-domain.com", "server": "ns1.lan.my-domain.com" }]'
```
