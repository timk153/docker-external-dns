import { Logger } from '@nestjs/common';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import Docker from 'dockerode';
import { ConfigService } from '@nestjs/config';
import each from 'jest-each';
import { validDnsAEntry } from '../dto/dnsa-entry.spec';
import { validDnsCnameEntry } from '../dto/dnscname-entry.spec';
import { DnsbaseEntry, DNSTypes } from '../dto/dnsbase-entry';
import { DnsaCloudflareEntry } from '../dto/dnsa-cloudflare-entry';
import { DockerFactory } from './docker.factory';
import { DockerService, States } from './docker.service';
import { NestedError } from '../errors/nested-error';
import { validDnsMxEntry } from '../dto/dnsmx-entry.spec';
import { validDnsNsEntry } from '../dto/dnsns-entry.spec';
import { DnsaEntry } from '../dto/dnsa-entry';
import { DnsCnameEntry } from '../dto/dnscname-entry';
import { DnsMxEntry } from '../dto/dnsmx-entry';
import { DnsNsEntry } from '../dto/dnsns-entry';

jest.mock('@nestjs/common', () => {
  const mock = jest.createMockFromModule('@nestjs/common') as any;
  const actual = jest.requireActual('@nestjs/common');

  return { ...actual, Logger: mock.Logger };
});

class ContainerInfoBuilder<T extends DnsbaseEntry> {
  labelValue: T;

  idValue: string;

  constructor(private dockerLabel: string) {}

  WithId(id: string) {
    this.idValue = id;
    return this;
  }

  WithLabel(label: T) {
    this.labelValue = label;
    return this;
  }

  Build() {
    const result = createMock<Docker.ContainerInfo>();
    result.Id = this.idValue;
    result.Labels = {
      [this.dockerLabel]: JSON.stringify(this.labelValue),
    };
    return result;
  }
}

describe('DockerService', () => {
  const backupProcessEnv = process.env;
  let sut: DockerService;
  let mockDockerFactory: DeepMocked<DockerFactory>;
  let mockConfigService: DeepMocked<ConfigService>;
  const mockDockerFactoryGetValue = createMock<Docker>();
  const mockDockerListContainersValue: Docker.ContainerInfo[] = [
    'container-info-1',
    'container-info-2',
  ] as unknown as Docker.ContainerInfo[];
  const mockConfigServiceGetValue = {
    PROJECT_LABEL: 'project-label',
    INSTANCE_ID: 'instance-id',
  };
  let expectedDockerLabel = '';

  beforeAll(() => {
    const { PROJECT_LABEL, INSTANCE_ID } = mockConfigServiceGetValue;
    process.env.PROJECT_LABEL = PROJECT_LABEL;
    process.env.INSTANCE_ID = INSTANCE_ID;
    expectedDockerLabel = `${PROJECT_LABEL}.${INSTANCE_ID}`;
  });

  afterAll(() => {
    process.env = backupProcessEnv;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DockerService],
    })
      .useMocker(createMock)
      .compile();

    mockDockerFactoryGetValue.listContainers.mockResolvedValue(
      mockDockerListContainersValue,
    );

    mockDockerFactory = module.get<DockerFactory>(
      DockerFactory,
    ) as DeepMocked<DockerFactory>;
    mockDockerFactory.get.mockReturnValue(mockDockerFactoryGetValue);

    mockConfigService = module.get<ConfigService>(
      ConfigService,
    ) as DeepMocked<ConfigService>;
    mockConfigService.get.mockImplementation(
      (propertyPath) => mockConfigServiceGetValue[propertyPath],
    );

    sut = module.get<DockerService>(DockerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('initialize', () => {
    it('should initialize docker', () => {
      // arrange
      sut['state'] = States.Unintialized;

      // for some unknown reason clearAllMocks doesn't work
      // but manually clearing this get before the test does
      mockDockerFactory.get.mockClear();

      // act
      sut.initialize();

      // assert
      expect(mockDockerFactory.get).toHaveBeenCalledTimes(1);
      expect(sut['docker']).toBe(mockDockerFactoryGetValue);
      expect(mockConfigService.get).toHaveBeenCalledTimes(2);
      expect(mockConfigService.get).toHaveBeenCalledWith('PROJECT_LABEL', {
        infer: true,
      });
      expect(mockConfigService.get).toHaveBeenCalledWith('INSTANCE_ID', {
        infer: true,
      });
      expect(sut['dockerLabel']).toEqual(expectedDockerLabel);
      expect(sut['state']).toBe(States.Initialized);
    });

    it('should throw if initialize docker throws', () => {
      // arrange
      sut['state'] = States.Unintialized;

      const factoryError = new Error('error');
      const error = new NestedError(
        'DockerService, initialize: Failed initializing docker service',
        factoryError,
      );
      mockDockerFactory.get.mockImplementationOnce(() => {
        throw factoryError;
      });

      // act / assert
      expect(() => sut.initialize()).toThrow(error);
      expect(sut['state']).toBe(States.Unintialized);
    });

    it('should throw if already initialized', () => {
      // arrange
      sut['state'] = States.Initialized;

      const error = new Error(
        'DockerService, initialize: Failed initializing docker service, service alread initialized',
      );

      // act / assert
      expect(() => sut.initialize()).toThrow(error);
      expect(sut['state']).toBe(States.Initialized);
    });
  });

  describe('initialized methods', () => {
    beforeEach(() => {
      sut['state'] = States.Initialized;
      sut['docker'] = mockDockerFactoryGetValue;
      sut['dockerLabel'] = expectedDockerLabel;
    });

    describe('getContainers', () => {
      it('should return docker containers and filter by label', async () => {
        // act
        const result = await sut.getContainers();

        // assert
        expect(result).toBe(mockDockerListContainersValue);
        expect(mockDockerFactoryGetValue.listContainers).toHaveBeenCalledTimes(
          1,
        );
        expect(mockDockerFactoryGetValue.listContainers).toHaveBeenCalledWith({
          filters: JSON.stringify({ label: [expectedDockerLabel] }),
        });
      });

      it('should error if getContainers errors', async () => {
        // arrange
        const getContainersError = new Error('error');
        const error = new NestedError(
          'DockerService, getContainers: Failed getting containers',
          getContainersError,
        );
        mockDockerFactoryGetValue.listContainers.mockRejectedValueOnce(
          getContainersError,
        );

        // act / assert
        expect(async () => sut.getContainers()).rejects.toThrow(error);
      });

      it('should error if not initialized', async () => {
        // arrange
        sut['state'] = States.Unintialized;
        const error = new Error(
          'DockerService, getContainers: not initialized, must call initialize',
        );

        // act / assert
        expect(async () => sut.getContainers()).rejects.toThrow(error);
      });
    });

    describe('extractDNSEntries', () => {
      const mockAEntry = validDnsAEntry(DnsaEntry);
      const mockCnameEntry = validDnsCnameEntry(DnsCnameEntry);
      const mockMxEntry = validDnsMxEntry(DnsMxEntry);
      const mockNsEntry = validDnsNsEntry(DnsNsEntry);

      let mockContainerInfoBuilder: ContainerInfoBuilder<DnsbaseEntry>;
      let mockAContainerInfo: Docker.ContainerInfo;
      let mockCnameContainerInfo: Docker.ContainerInfo;
      let mockMxContainerInfo: Docker.ContainerInfo;
      let mockNsContainerInfo: Docker.ContainerInfo;

      beforeAll(() => {
        mockContainerInfoBuilder = new ContainerInfoBuilder(
          expectedDockerLabel,
        );

        mockAContainerInfo = mockContainerInfoBuilder
          .WithId('id-a')
          .WithLabel(mockAEntry)
          .Build();

        mockCnameContainerInfo = mockContainerInfoBuilder
          .WithId('id-cname')
          .WithLabel(mockCnameEntry)
          .Build();

        mockMxContainerInfo = mockContainerInfoBuilder
          .WithId('id-mx')
          .WithLabel(mockMxEntry)
          .Build();

        mockNsContainerInfo = mockContainerInfoBuilder
          .WithId('id-ns')
          .WithLabel(mockNsEntry)
          .Build();
      });

      const createMockContainers = (mockToTest: Docker.ContainerInfo) => [
        mockAContainerInfo,
        mockToTest,
        mockNsContainerInfo,
      ];
      const createMockContainersDefaultValidResult = [mockAEntry, mockNsEntry];

      let mockLogger: Logger;

      beforeEach(() => {
        mockLogger = sut['logger'];
      });

      it('should deserialize successfully', () => {
        // arrange
        const paramContainers = [
          mockAContainerInfo,
          mockCnameContainerInfo,
          mockMxContainerInfo,
          mockNsContainerInfo,
        ];
        const expected = [
          mockAEntry,
          mockCnameEntry,
          mockMxContainerInfo,
          mockNsContainerInfo,
        ];

        // act / assert
        expect(sut.extractDNSEntries(paramContainers)).toEqual(expected);
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });

      it('should warn and ignore if type is Unsupported', () => {
        // arrange
        const mockUnsupportedEntry = {
          ...mockAEntry,
          type: DNSTypes.Unsupported,
        };
        const mockUnsupportedContainerInfo = mockContainerInfoBuilder
          .WithId('id-unsupported')
          .WithLabel(mockUnsupportedEntry)
          .Build();

        // act / assert
        expect(sut.extractDNSEntries([mockUnsupportedContainerInfo])).toEqual(
          [],
        );
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          `DockerService, extractDNSEntries: container with id ${mockUnsupportedContainerInfo.Id} is using 'Unsupported' type, it will be ignored`,
        );
      });

      each(['', '  ', 'dsoifhadsopifhgas']).it(
        "should warn and ignore if label ('%p') isn't JSON",
        (label) => {
          // arrange
          const mockContainerInfo = createMock<Docker.ContainerInfo>();
          mockContainerInfo.Id = 'conatiner-info-id';
          mockContainerInfo.Labels = { [expectedDockerLabel]: label };
          const paramContainers = createMockContainers(mockContainerInfo);

          // act
          const result = sut.extractDNSEntries(paramContainers);

          // assert
          expect(result).toStrictEqual(createMockContainersDefaultValidResult);
          expect(mockLogger.warn).toHaveBeenCalledTimes(1);
          expect(mockLogger.warn).toHaveBeenCalledWith(
            `DockerService, extractDNSEntries: container with id ${mockContainerInfo.Id} has a non JSON formatted label`,
          );
        },
      );

      each([
        JSON.stringify({ something: 'hi', boo: 1 }),
        JSON.stringify({ type: 'invalid', something: 'hi', boo: 1 }),
        JSON.stringify({
          name: 'name',
          server: '1.4.774.22',
          test: new Date(),
        }),
        JSON.stringify({ type: -1, name: 'invalid-2' }),
        '1234',
        'true',
      ]).it(
        "should warn and ignore if it is JSON but it's unrecognised ('%p')",
        (label) => {
          // arrange
          const mockContainerInfo = createMock<Docker.ContainerInfo>();
          mockContainerInfo.Id = 'conatiner-info-id';
          mockContainerInfo.Labels = { [expectedDockerLabel]: label };
          const paramContainers = createMockContainers(mockContainerInfo);

          // act
          const result = sut.extractDNSEntries(paramContainers);

          // assert
          expect(result).toStrictEqual(createMockContainersDefaultValidResult);
          expect(mockLogger.warn).toHaveBeenCalledTimes(1);
          expect(mockLogger.warn).toHaveBeenCalledWith(
            `DockerService, extractDNSEntries: container with id ${mockContainerInfo.Id} has an unrecognised shape, check the values`,
          );
        },
      );
      it('should warn and ignore if invalid', () => {
        // arrange
        const mockAEntryInvalid = { ...mockAEntry };
        mockAEntryInvalid.address = 'not-an-ip-address';
        const mockContainerInfo = mockContainerInfoBuilder
          .WithId('id-a')
          .WithLabel(mockAEntryInvalid)
          .Build();
        const paramContainers = createMockContainers(mockContainerInfo);

        // act
        const result = sut.extractDNSEntries(paramContainers);

        // assert
        expect(result).toStrictEqual(createMockContainersDefaultValidResult);
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          `DockerService, extractDNSEntries: container with id ${mockContainerInfo.Id} has validation errors`,
          expect.arrayContaining([
            expect.objectContaining({
              property: 'address',
              value: mockAEntryInvalid.address,
            }),
          ]),
        );
        // TODO output the errors as context
        // Resume from this location
        // Consider mocking class-validator and wiring up it's errors for these unit tests.
        // Will still require integration test
      });
      it('should warn and ignore if id is present', () => {
        // arrange
        const mockAEntryWithId = { ...mockAEntry } as DnsaCloudflareEntry;
        mockAEntryWithId.id = 'cloudflare-id-value';
        const mockContainerInfo = mockContainerInfoBuilder
          .WithId('id-a')
          .WithLabel(mockAEntryWithId)
          .Build();
        const paramContainers = createMockContainers(mockContainerInfo);

        // act
        const result = sut.extractDNSEntries(paramContainers);

        // assert
        expect(result).toStrictEqual(createMockContainersDefaultValidResult);
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          `DockerService, extractDNSEntries: container with id ${mockContainerInfo.Id} has 'id' within it's JSON label, please remove it`,
        );
      });

      it('should error if not initialized', () => {
        // arrange
        sut['state'] = States.Unintialized;
        const error = new Error(
          'DockerService, extractDNSEntries: not initialized, must call initialize',
        );

        // act / assert
        expect(() => sut.extractDNSEntries([mockAContainerInfo])).toThrow(
          error,
        );
      });
    });
  });
});
