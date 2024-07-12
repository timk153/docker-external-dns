import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
} from 'testcontainers';
import Dockerode from 'dockerode';
import { DnsaEntry } from '../src/dto/dnsa-entry';
import { DnsCnameEntry } from '../src/dto/dnscname-entry';
import { DnsMxEntry } from '../src/dto/dnsmx-entry';
import { DnsNsEntry } from '../src/dto/dnsns-entry';
import { validDnsAEntry } from '../src/dto/dnsa-entry.spec';
import { validDnsCnameEntry } from '../src/dto/dnscname-entry.spec';
import { validDnsMxEntry } from '../src/dto/dnsmx-entry.spec';
import { DockerService } from '../src/docker/docker.service';
import { AppModule } from '../src/app.module';
import { validDnsNsEntry } from '../src/dto/dnsns-entry.spec';

describe('DockerService (e2e)', () => {
  let app: INestApplication;
  let sut: DockerService;

  const label = 'docker-compose-external-dns.1';

  type TestContainerInstances = {
    network: StartedNetwork;
    A: StartedTestContainer;
    AMultiLabel: StartedTestContainer;
    CNAME: StartedTestContainer;
    MX: StartedTestContainer;
    NS: StartedTestContainer;
    NotDNS1: StartedTestContainer;
    NotDNS2: StartedTestContainer;
    invalid: StartedTestContainer;
  };
  const containerInstances: TestContainerInstances =
    {} as unknown as TestContainerInstances;

  type TestContainerLabelValues = {
    A: DnsaEntry;
    AMultiLabel: DnsaEntry;
    CNAME: DnsCnameEntry;
    MX: DnsMxEntry;
    NS: DnsNsEntry;
    Invalid: DnsaEntry;
  };
  const entryValues: TestContainerLabelValues =
    {} as unknown as TestContainerLabelValues;

  // Starts up the test containers.
  // Overridden timeout to allow up to 5 minutes to start containers
  // NOTE! this was attempted with docker-compose up had issues locally and in container
  //       Changed to orchestrate the containers in code instead.
  beforeAll(async () => {
    entryValues.A = validDnsAEntry();
    entryValues.AMultiLabel = validDnsAEntry();
    entryValues.AMultiLabel.name = 'multi.testdomain.com';
    entryValues.CNAME = validDnsCnameEntry();
    entryValues.MX = validDnsMxEntry();
    entryValues.NS = validDnsNsEntry();
    entryValues.Invalid = validDnsAEntry();
    entryValues.Invalid.name = 'not-an-fqdn';

    containerInstances.network = await new Network().start();

    // NOTE! DNS suffix on WithName required as 'A' isn't a valid docker container name
    containerInstances.A = await new GenericContainer('busybox')
      .withName('DNSA')
      .withNetworkMode('host')
      .withCommand(['sleep', '3600'])
      .withLabels({
        [label]: JSON.stringify(entryValues.A),
      })
      .start();

    containerInstances.AMultiLabel = await new GenericContainer('busybox')
      .withName('DNSAMultiLabel')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        'com.host.description': 'hello',
        [label]: JSON.stringify(entryValues.AMultiLabel),
      })
      .start();

    containerInstances.CNAME = await new GenericContainer('busybox')
      .withName('DNSCNAME')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: JSON.stringify(entryValues.CNAME),
      })
      .start();

    containerInstances.MX = await new GenericContainer('busybox')
      .withName('DNSMX')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: JSON.stringify(entryValues.MX),
      })
      .start();

    containerInstances.NS = await new GenericContainer('busybox')
      .withName('DNSNS')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: JSON.stringify(entryValues.NS),
      })
      .start();

    containerInstances.NotDNS1 = await new GenericContainer('busybox')
      .withName('DNSNotDNS1')
      .withNetworkMode('host')
      .withCommand(['sleep', '3600'])
      .withLabels({
        'com.host.description': 'label',
        'com.docker.thingy': '123',
        'org.begin': '{ type: "A", name: "Other thing"  }',
      })
      .start();

    containerInstances.NotDNS2 = await new GenericContainer('busybox')
      .withName('DNSNotDNS2')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        'com.host.description': 'label',
      })
      .start();

    containerInstances.invalid = await new GenericContainer('busybox')
      .withName('DNSInvalid')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: JSON.stringify(entryValues.Invalid),
      })
      .start();
  }, 3000000);

  afterAll(async () => {
    await containerInstances.A.stop();
    await containerInstances.AMultiLabel.stop();
    await containerInstances.CNAME.stop();
    await containerInstances.MX.stop();
    await containerInstances.NS.stop();
    await containerInstances.NotDNS1.stop();
    await containerInstances.NotDNS2.stop();
    await containerInstances.invalid.stop();
    await containerInstances.network.stop();
  }, 3000000);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sut = app.get(DockerService);
    sut.initialize();
  });

  let fetchedContainers: Dockerode.ContainerInfo[];

  it('should list containers with matching labels', async () => {
    // act
    fetchedContainers = await sut.getContainers();

    // assert
    expect(fetchedContainers).toHaveLength(6);
    expect(fetchedContainers[0].Names[0]).toContain('DNSInvalid');
    expect(fetchedContainers[1].Names[0]).toContain('DNSNS');
    expect(fetchedContainers[2].Names[0]).toContain('DNSMX');
    expect(fetchedContainers[3].Names[0]).toContain('DNSCNAME');
    expect(fetchedContainers[4].Names[0]).toContain('DNSAMultiLabel');
    expect(fetchedContainers[5].Names[0]).toContain('DNSA');
  });

  it('should parse the listed containers, skipping the invalid one', async () => {
    // act
    const parsedContainers = sut.getDNSEntries(fetchedContainers);

    // assert
    expect(parsedContainers[0]).toEqual(entryValues.NS);
    expect(parsedContainers[1]).toEqual(entryValues.MX);
    expect(parsedContainers[2]).toEqual(entryValues.CNAME);
    expect(parsedContainers[4]).toEqual(entryValues.A);
    expect(parsedContainers[3]).toEqual(entryValues.AMultiLabel);
  });
});
