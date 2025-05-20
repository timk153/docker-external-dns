import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import Docker from 'dockerode';
import { ConfigService } from '@nestjs/config';
import each from 'jest-each';
import { DnsUnsupportedCloudFlareEntry } from '../dto/dnsunsupported-cloudflare-entry';
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
import { ConsoleLoggerService } from '../logger.service';

jest.mock('@nestjs/common', () => {
  const mock = jest.createMockFromModule('@nestjs/common') as any;
  const actual = jest.requireActual('@nestjs/common');

  return { ...actual, Logger: mock.Logger };
});

class ContainerInfoBuilder<T extends DnsbaseEntry> {
  labelValues: T[] = [];

  idValue: string;

  constructor(private dockerLabel: string) {}

  WithId(id: string) {
    this.idValue = id;
    return this;
  }

  WithLabel(label: T) {
    this.labelValues.push(label);
    return this;
  }

  Build() {
    const result = createMock<Docker.ContainerInfo>();
    result.Id = this.idValue;
    result.Labels = {
      [this.dockerLabel]: JSON.stringify(this.labelValues),
    };

    this.labelValues = [];

    return result;
  }
}

describe('DockerService', () => {
  const backupProcessEnv = process.env;
  let sut: DockerService;
  let mockDockerFactory: DeepMocked<DockerFactory>;
  let mockConfigService: DeepMocked<ConfigService>;
  let mockConsoleLoggerService: DeepMocked<ConsoleLoggerService>;
  const mockDockerFactoryGetValue = createMock<Docker>();
  const mockDockerListContainersValue: Docker.ContainerInfo[] = [
    'container-info-1',
    'container-info-2',
  ] as unknown as Docker.ContainerInfo[];
  const mockConfigServiceGetValue = {
    ENTRY_IDENTIFIER: 'project-label:instance-id',
    PRESERVE_STOPPED: false,
  };
  let expectedDockerLabel = '';
  let expectedPreserveStopped = false;

  beforeAll(() => {
    const { ENTRY_IDENTIFIER, PRESERVE_STOPPED } = mockConfigServiceGetValue;
    process.env.ENTRY_IDENTIFIER = ENTRY_IDENTIFIER;
    process.env.PRESERVE_STOPPED = PRESERVE_STOPPED.toString();
    expectedDockerLabel = ENTRY_IDENTIFIER;
    expectedPreserveStopped = PRESERVE_STOPPED;
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

    mockConsoleLoggerService = module.get(ConsoleLoggerService);

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
      expect(mockConfigService.get).toHaveBeenCalledWith('ENTRY_IDENTIFIER', {
        infer: true,
      });
      expect(mockConfigService.get).toHaveBeenCalledWith('PRESERVE_STOPPED', {
        infer: true,
      });
      expect(sut['dockerLabel']).toEqual(expectedDockerLabel);
      expect(sut['preserveStopped']).toEqual(expectedPreserveStopped);
      expect(sut['state']).toBe(States.Initialized);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.verbose).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'trace',
          method: 'initialize',
          service: 'DockerService',
          params: '[]',
        }),
      );
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
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          method: 'initialize',
          service: 'DockerService',
          params: '[]',
        }),
      );
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
      expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
      expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          method: 'initialize',
          service: 'DockerService',
          params: '[]',
        }),
      );
    });
  });

  describe('initialized methods', () => {
    beforeEach(() => {
      sut['state'] = States.Initialized;
      sut['docker'] = mockDockerFactoryGetValue;
      sut['dockerLabel'] = expectedDockerLabel;
      sut['preserveStopped'] = expectedPreserveStopped;
    });

    describe('getContainers', () => {
      each([true, false]).it(
        'should return docker containers and filter by label (PRESERVE_STOPPED: %p)',
        async (preserveStopped) => {
          // arrange
          sut['preserveStopped'] = preserveStopped;

          // act
          const result = await sut.getContainers();

          // assert
          expect(result).toBe(mockDockerListContainersValue);
          expect(
            mockDockerFactoryGetValue.listContainers,
          ).toHaveBeenCalledTimes(1);
          expect(mockDockerFactoryGetValue.listContainers).toHaveBeenCalledWith(
            {
              all: preserveStopped,
              filters: JSON.stringify({ label: [expectedDockerLabel] }),
            },
          );
          expect(mockConsoleLoggerService.verbose).toHaveBeenCalledTimes(1);
          expect(mockConsoleLoggerService.verbose).toHaveBeenCalledWith(
            expect.objectContaining({
              level: 'trace',
              method: 'getContainers',
              service: 'DockerService',
              params: '[]',
            }),
          );
        },
      );

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
        await expect(async () => sut.getContainers()).rejects.toThrow(error);
        expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'error',
            method: 'getContainers',
            service: 'DockerService',
            params: '[]',
          }),
        );
      });

      it('should error if not initialized', async () => {
        // arrange
        sut['state'] = States.Unintialized;
        const error = new Error(
          'DockerService, getContainers: not initialized, must call initialize',
        );

        // act / assert
        await expect(async () => sut.getContainers()).rejects.toThrow(error);
        expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'error',
            method: 'getContainers',
            service: 'DockerService',
            params: '[]',
          }),
        );
      });
    });

    describe('extractDNSEntries', () => {
      const mockAEntry = validDnsAEntry(DnsaEntry);
      const mockCnameEntry = validDnsCnameEntry(DnsCnameEntry);
      const mockMxEntry = validDnsMxEntry(DnsMxEntry);
      const mockNsEntry = validDnsNsEntry(DnsNsEntry);
      const mockMultiLabelAEntry = validDnsAEntry(DnsaEntry, {
        name: 'multilabel-a.test-domain.com',
      });
      const mockMultiLabelCnameEntry = validDnsCnameEntry(DnsCnameEntry, {
        name: 'multilabel-cname.test-domain.com',
      });

      let mockContainerInfoBuilder: ContainerInfoBuilder<DnsbaseEntry>;
      let mockAContainerInfo: Docker.ContainerInfo;
      let mockCnameContainerInfo: Docker.ContainerInfo;
      let mockMultiLabelContainerInfo: Docker.ContainerInfo;
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

        mockMultiLabelContainerInfo = mockContainerInfoBuilder
          .WithId('id-multilabel')
          .WithLabel(mockMultiLabelAEntry)
          .WithLabel(mockMultiLabelCnameEntry)
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
      const createMockContainersDefaultValidMultiLabelResult = [
        mockAEntry,
        mockMxEntry,
        mockNsEntry,
      ];

      it('should deserialize successfully', () => {
        // arrange
        const paramContainers = [
          mockAContainerInfo,
          mockCnameContainerInfo,
          mockMultiLabelContainerInfo,
          mockMxContainerInfo,
          mockNsContainerInfo,
        ];
        const expected = [
          mockAEntry,
          mockCnameEntry,
          mockMultiLabelAEntry,
          mockMultiLabelCnameEntry,
          mockMxEntry,
          mockNsEntry,
        ];

        // act / assert
        expect(sut.extractDNSEntries(paramContainers)).toEqual(expected);
        expect(mockConsoleLoggerService.warn).not.toHaveBeenCalled();
        expect(mockConsoleLoggerService.debug).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.debug).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'debug',
            method: 'extractDNSEntries',
            service: 'DockerService',
          }),
        );
      });

      it('should warn and ignore all if two or more entries share the same unique identifier', () => {
        // arrange
        const paramContainers = [
          mockAContainerInfo,
          mockCnameContainerInfo,
          mockMxContainerInfo,
          mockContainerInfoBuilder
            .WithId('id-cname')
            .WithLabel({
              ...mockCnameEntry,
              target: 'something-else.com',
            } as DnsCnameEntry)
            .Build(),
          mockContainerInfoBuilder
            .WithId('id-cname')
            .WithLabel({
              ...mockCnameEntry,
              target: 'a-third.different.com',
            } as DnsCnameEntry)
            .Build(),
          mockContainerInfoBuilder
            .WithId('id-cname')
            .WithLabel({
              ...mockMxEntry,
              server: 'mx1.different-value.com',
            } as DnsMxEntry)
            .Build(),
          mockNsContainerInfo,
        ];
        const expected = [mockAEntry, mockNsEntry];
        const expectedWarnings = [
          {
            containerIds: JSON.stringify([
              paramContainers[1].Id,
              paramContainers[3].Id,
              paramContainers[4].Id,
            ]),
            entries: JSON.stringify({
              type: mockCnameEntry.type,
              name: mockCnameEntry.name,
            }),
          },
          {
            containerIds: JSON.stringify([
              paramContainers[2].Id,
              paramContainers[5].Id,
            ]),
            entries: JSON.stringify({
              type: mockMxEntry.type,
              name: mockMxEntry.name,
            }),
          },
        ];

        // act
        expect(sut.extractDNSEntries(paramContainers)).toEqual(expected);

        // assert
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(2);
        expectedWarnings.forEach(({ containerIds, entries }) => {
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
            `DockerService, extractDNSEntries: containers with id's ${containerIds} have share duplicate entries for '${entries}'; all will be ignored`,
          );
        });
        expect(mockConsoleLoggerService.error).not.toHaveBeenCalled();
        expect(mockConsoleLoggerService.debug).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.debug).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'debug',
            method: 'extractDNSEntries',
            service: 'DockerService',
          }),
        );
      });

      it('should warn and ignore if type is Unsupported, but process other valid entries', () => {
        // arrange
        const mockUnsupportedEntry = {
          ...mockAEntry,
          type: DNSTypes.Unsupported,
        } as unknown as DnsUnsupportedCloudFlareEntry;
        const mockUnsupportedContainerInfo = mockContainerInfoBuilder
          .WithId('id-unsupported')
          .WithLabel(mockUnsupportedEntry)
          .WithLabel(mockAEntry)
          .Build();

        // act / assert
        expect(sut.extractDNSEntries([mockUnsupportedContainerInfo])).toEqual([
          mockAEntry,
        ]);
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
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
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(1);
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
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
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(1);
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
            `DockerService, extractDNSEntries: container with id ${mockContainerInfo.Id} has an unrecognised shape, check the values`,
          );
        },
      );

      each(['[]', '[     ]']).it(
        "should warn and ignore if it is empty JSON array ('%p')",
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
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(1);
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
            `DockerService, extractDNSEntries: container with id ${mockContainerInfo.Id} has empty array for a label and has been ignored`,
          );
        },
      );

      each([
        'true',
        '12345',
        JSON.stringify({ some: 'test', garbage: false }),
      ]).it(
        "should warn and ignore if it is a JSON array with an unrecognised value ('%p'), but process other valid entries",
        (garbage) => {
          // arrange
          const mockContainerInfo = createMock<Docker.ContainerInfo>();
          mockContainerInfo.Id = 'conatiner-info-id';
          mockContainerInfo.Labels = {
            [expectedDockerLabel]: JSON.stringify([garbage, mockMxEntry]),
          };
          const paramContainers = createMockContainers(mockContainerInfo);

          // act
          const result = sut.extractDNSEntries(paramContainers);

          // assert
          expect(result).toStrictEqual(
            createMockContainersDefaultValidMultiLabelResult,
          );
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(1);
          expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
            `DockerService, extractDNSEntries: container with id ${mockContainerInfo.Id} has an unrecognised shape, check the values`,
          );
        },
      );

      it('should warn and ignore if invalid, but process other valid entries', () => {
        // arrange
        const mockAEntryInvalid = { ...mockAEntry };
        mockAEntryInvalid.address = 'not-an-ip-address';
        const mockContainerInfo = mockContainerInfoBuilder
          .WithId('id-a')
          .WithLabel(mockAEntryInvalid as DnsaEntry)
          .WithLabel(mockMxEntry)
          .Build();
        const paramContainers = createMockContainers(mockContainerInfo);

        // act
        const result = sut.extractDNSEntries(paramContainers);

        // assert
        expect(result).toEqual(
          createMockContainersDefaultValidMultiLabelResult,
        );
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
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

      it('should warn and ignore if id is present, but process other valid entries', () => {
        // arrange
        const mockAEntryWithId = { ...mockAEntry } as DnsaCloudflareEntry;
        mockAEntryWithId.id = 'cloudflare-id-value';
        const mockContainerInfo = mockContainerInfoBuilder
          .WithId('id-a')
          .WithLabel(mockAEntryWithId)
          .WithLabel(mockMxEntry)
          .Build();
        const paramContainers = createMockContainers(mockContainerInfo);

        // act
        const result = sut.extractDNSEntries(paramContainers);

        // assert
        expect(result).toStrictEqual(
          createMockContainersDefaultValidMultiLabelResult,
        );
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.warn).toHaveBeenCalledWith(
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
        expect(mockConsoleLoggerService.error).toHaveBeenCalledTimes(1);
        expect(mockConsoleLoggerService.error).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'error',
            method: 'extractDNSEntries',
            service: 'DockerService',
          }),
        );
      });
    });
  });
});
