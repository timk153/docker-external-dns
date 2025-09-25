// allow dot notation to override private scoped variables for test cases
/* eslint-disable @typescript-eslint/dot-notation */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
} from 'testcontainers';
import Dockerode from 'dockerode';
import { AppModule } from '../src/app.module';
import { DnsaEntry } from '../src/dto/dnsa-entry';
import { DnsCnameEntry } from '../src/dto/dnscname-entry';
import { DnsMxEntry } from '../src/dto/dnsmx-entry';
import { DnsNsEntry } from '../src/dto/dnsns-entry';
import { validDnsAEntry } from '../src/dto/dnsa-entry.spec';
import { validDnsCnameEntry } from '../src/dto/dnscname-entry.spec';
import { validDnsMxEntry } from '../src/dto/dnsmx-entry.spec';
import { DockerService } from '../src/docker/docker.service';
import { validDnsNsEntry } from '../src/dto/dnsns-entry.spec';
import { getConfigModuleImport } from '../src/app.configuration';

describe('DockerService (Integration)', () => {
  const backupEnvironment = { ...process.env };
  let app: INestApplication;
  let sut: DockerService;

  const label = 'docker-compose-external-dns:1';

  type TestContainerInstances = {
    network: StartedNetwork;
    A: StartedTestContainer;
    AMultiLabel: StartedTestContainer;
    CNAME: StartedTestContainer;
    Duplicate1: StartedTestContainer;
    MX: StartedTestContainer;
    NS: StartedTestContainer;
    MultiLabelSomeInvalid: StartedTestContainer;
    NotDNS1: StartedTestContainer;
    NotDNS2: StartedTestContainer;
    Duplicate2: StartedTestContainer;
    Invalid: StartedTestContainer;
    Empty: StartedTestContainer;
  };
  const containerInstances: TestContainerInstances =
    {} as unknown as TestContainerInstances;

  type TestContainerLabelValues = {
    A: DnsaEntry[];
    AMultiLabel: DnsaEntry[];
    CNAME: DnsCnameEntry[];
    Duplicate1: DnsMxEntry[];
    MX: DnsMxEntry[];
    NS: DnsNsEntry[];
    MultiLabelSomeInvalid: any[];
    Duplicate2: DnsMxEntry[];
    Invalid: DnsaEntry[];
  };
  const entryValues: TestContainerLabelValues =
    {} as unknown as TestContainerLabelValues;

  // Starts up the test containers.
  // Overridden timeout to allow up to 5 minutes to start containers
  // NOTE! this was attempted with docker-compose up had issues locally and in container
  //       Changed to orchestrate the containers in code instead.
  beforeAll(async () => {
    entryValues.A = [validDnsAEntry(DnsaEntry)];
    entryValues.AMultiLabel = [validDnsAEntry(DnsaEntry)];
    entryValues.AMultiLabel[0].name = 'multi.testdomain.com';
    entryValues.CNAME = [validDnsCnameEntry(DnsCnameEntry)];
    entryValues.Duplicate1 = [validDnsMxEntry(DnsMxEntry)];
    entryValues.Duplicate1[0].name = 'duplicate.test-domain.com';
    entryValues.MX = [validDnsMxEntry(DnsMxEntry)];
    entryValues.NS = [validDnsNsEntry(DnsNsEntry)];
    entryValues.MultiLabelSomeInvalid = [
      validDnsAEntry(DnsaEntry),
      12345,
      true,
      validDnsAEntry(DnsaEntry),
      validDnsMxEntry(DnsMxEntry),
      validDnsCnameEntry(DnsCnameEntry),
    ];
    entryValues.MultiLabelSomeInvalid[0].name = 'a.multi.testdomain.com';
    entryValues.MultiLabelSomeInvalid[5].name = 'cname.multi.testdomain.com';
    entryValues.MultiLabelSomeInvalid[3].id = 'has-an-id';
    entryValues.MultiLabelSomeInvalid[4].name = 'is-not-a-fqdn';
    entryValues.Duplicate2 = [validDnsMxEntry(DnsMxEntry)];
    entryValues.Duplicate2[0].name = 'duplicate.test-domain.com';
    entryValues.Invalid = [validDnsAEntry(DnsaEntry)];
    entryValues.Invalid[0].name = 'not-an-fqdn';

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

    containerInstances.Duplicate1 = await new GenericContainer('busybox')
      .withName('DNSDuplicate1')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: JSON.stringify(entryValues.Duplicate1),
      })
      .start();

    containerInstances.MultiLabelSomeInvalid = await new GenericContainer(
      'busybox',
    )
      .withName('DNSMultiLabel')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: JSON.stringify(entryValues.MultiLabelSomeInvalid),
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

    containerInstances.Duplicate2 = await new GenericContainer('busybox')
      .withName('DNSDuplicate2')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: JSON.stringify(entryValues.Duplicate2),
      })
      .start();

    containerInstances.Invalid = await new GenericContainer('busybox')
      .withName('DNSInvalid')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: JSON.stringify(entryValues.Invalid),
      })
      .start();

    containerInstances.Empty = await new GenericContainer('busybox')
      .withName('Empty')
      .withCommand(['sleep', '3600'])
      .withNetwork(containerInstances.network)
      .withLabels({
        [label]: '[]',
      })
      .start();
  }, 3000000);

  afterAll(async () => {
    await containerInstances.A.stop();
    await containerInstances.AMultiLabel.stop();
    await containerInstances.CNAME.stop();
    await containerInstances.Duplicate1.stop();
    await containerInstances.MX.stop();
    await containerInstances.NS.stop();
    await containerInstances.MultiLabelSomeInvalid.stop();
    await containerInstances.NotDNS1.stop();
    await containerInstances.NotDNS2.stop();
    await containerInstances.Duplicate2.stop();
    await containerInstances.Invalid.stop();
    await containerInstances.Empty.stop();
    await containerInstances.network.stop();

    process.env = backupEnvironment;
  }, 3000000);

  async function initialize() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        {
          module: AppModule,
          imports: [getConfigModuleImport()],
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sut = app.get(DockerService);
    sut.initialize();
  }

  let fetchedContainers: Dockerode.ContainerInfo[];

  describe('fetch containers tests', () => {
    beforeAll(async () => {
      await containerInstances.Invalid.stop({ remove: false });
      await containerInstances.MX.stop({ remove: false });
    });

    it('should list containers with matching labels excluding stopped', async () => {
      // arrange
      process.env.PRESERVE_STOPPED = 'false';
      await initialize();

      // act
      fetchedContainers = await sut.getContainers();

      // assert
      expect(fetchedContainers).toHaveLength(8);
      expect(fetchedContainers[0].Names[0]).toContain('Empty');
      expect(fetchedContainers[1].Names[0]).toContain('DNSDuplicate2');
      expect(fetchedContainers[2].Names[0]).toContain('DNSNS');
      expect(fetchedContainers[3].Names[0]).toContain('DNSMultiLabel');
      expect(fetchedContainers[4].Names[0]).toContain('DNSDuplicate1');
      expect(fetchedContainers[5].Names[0]).toContain('DNSCNAME');
      expect(fetchedContainers[6].Names[0]).toContain('DNSAMultiLabel');
      expect(fetchedContainers[7].Names[0]).toContain('DNSA');
    });

    it('should list containers with matching labels including stopped', async () => {
      // arrange
      process.env.PRESERVE_STOPPED = 'true';
      await initialize();

      // act
      fetchedContainers = await sut.getContainers();

      // assert
      expect(fetchedContainers).toHaveLength(10);
      expect(fetchedContainers[0].Names[0]).toContain('Empty');
      expect(fetchedContainers[1].Names[0]).toContain('DNSInvalid');
      expect(fetchedContainers[2].Names[0]).toContain('DNSDuplicate2');
      expect(fetchedContainers[3].Names[0]).toContain('DNSNS');
      expect(fetchedContainers[4].Names[0]).toContain('DNSMX');
      expect(fetchedContainers[5].Names[0]).toContain('DNSMultiLabel');
      expect(fetchedContainers[6].Names[0]).toContain('DNSDuplicate1');
      expect(fetchedContainers[7].Names[0]).toContain('DNSCNAME');
      expect(fetchedContainers[8].Names[0]).toContain('DNSAMultiLabel');
      expect(fetchedContainers[9].Names[0]).toContain('DNSA');
    });
  });

  it('should parse the listed containers, skipping the invalid and empty ones', async () => {
    // arrange
    process.env.PRESERVE_STOPPED = 'false';
    await initialize();

    // act
    const parsedContainers = sut.extractDNSEntries(fetchedContainers);

    // assert
    expect(parsedContainers[0]).toEqual(entryValues.NS[0]);
    expect(parsedContainers[1]).toEqual(entryValues.MX[0]);
    expect(parsedContainers[2]).toEqual(entryValues.MultiLabelSomeInvalid[0]);
    expect(parsedContainers[3]).toEqual(entryValues.MultiLabelSomeInvalid[5]);
    expect(parsedContainers[4]).toEqual(entryValues.CNAME[0]);
    expect(parsedContainers[5]).toEqual(entryValues.AMultiLabel[0]);
    expect(parsedContainers[6]).toEqual(entryValues.A[0]);
  });
});
