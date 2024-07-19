import { validDnsCnameEntry } from '../src/dto/dnscname-entry.spec';
import { validDnsMxEntry } from '../src/dto/dnsmx-entry.spec';
import { validDnsNsEntry } from '../src/dto/dnsns-entry.spec';
import { DnsCnameEntry } from '../src/dto/dnscname-entry';
import { DnsMxEntry } from '../src/dto/dnsmx-entry';
import { DnsNsEntry } from '../src/dto/dnsns-entry';
import { DnsCnameCloudflareEntry } from '../src/dto/dnscname-cloudflare-entry';
import { DnsMxCloudflareEntry } from '../src/dto/dnsmx-cloudflare-entry';
import { DnsNsCloudflareEntry } from '../src/dto/dnsns-cloudflare-entry';
import { validDnsAEntry } from '../src/dto/dnsa-entry.spec';
import { DnsaEntry } from '../src/dto/dnsa-entry';
import { DnsaCloudflareEntry } from '../src/dto/dnsa-cloudflare-entry';
import { computeSetDifference } from '../src/app.functions';

describe('AppFunctions (Integration)', () => {
  describe('computeSetDifference', () => {
    it('should compute set difference', () => {
      // arrange
      const toAdd = [validDnsAEntry(DnsaEntry, { name: 'to-add' })];

      const toUpdateDocker = [
        validDnsAEntry(DnsaEntry, {
          name: 'to-update',
          address: 'updated-address',
        }),
        validDnsCnameEntry(DnsCnameEntry, {
          name: 'to-update',
          target: 'updated-target',
          proxy: true,
        }),
        validDnsMxEntry(DnsMxEntry, {
          name: 'to-update',
          server: 'updated-server',
          priority: 99,
        }),
        validDnsNsEntry(DnsNsEntry, {
          name: 'to-update',
          server: 'updated-server',
        }),
      ];

      const toUpdateCloudFlare = [
        validDnsAEntry(DnsaCloudflareEntry, {
          id: 'to-update-id',
          name: 'to-update',
        }),
        validDnsCnameEntry(DnsCnameCloudflareEntry, {
          id: 'to-update-id',
          name: 'to-update',
        }),
        validDnsMxEntry(DnsMxCloudflareEntry, {
          id: 'to-update-id',
          name: 'to-update',
        }),
        validDnsNsEntry(DnsNsCloudflareEntry, {
          id: 'to-update-id',
          name: 'to-update',
        }),
      ];

      const unchangedDocker = [
        validDnsAEntry(DnsaEntry, { name: 'unchanged' }),
        validDnsCnameEntry(DnsCnameEntry, { name: 'unchanged' }),
        validDnsMxEntry(DnsMxEntry, { name: 'unchanged' }),
        validDnsNsEntry(DnsNsEntry, { name: 'unchanged' }),
      ];

      const unchangedCloudFlare = [
        validDnsAEntry(DnsaCloudflareEntry, { name: 'unchanged' }),
        validDnsCnameEntry(DnsCnameCloudflareEntry, { name: 'unchanged' }),
        validDnsMxEntry(DnsMxCloudflareEntry, { name: 'unchanged' }),
        validDnsNsEntry(DnsNsCloudflareEntry, { name: 'unchanged' }),
      ];

      const toDelete = [
        validDnsAEntry(DnsaCloudflareEntry, {
          id: 'to-delete-id',
          name: 'to-delete',
        }),
      ];

      // act / assert
      expect(
        computeSetDifference(
          [...toAdd, ...toUpdateDocker, ...unchangedDocker],
          [...toUpdateCloudFlare, ...unchangedCloudFlare, ...toDelete],
        ),
      ).toEqual({
        unchanged: unchangedCloudFlare,
        add: toAdd,
        delete: toDelete,
        update: [
          { old: toUpdateCloudFlare[0], update: toUpdateDocker[0] },
          { old: toUpdateCloudFlare[1], update: toUpdateDocker[1] },
          { old: toUpdateCloudFlare[2], update: toUpdateDocker[2] },
          { old: toUpdateCloudFlare[3], update: toUpdateDocker[3] },
        ],
      });
    });
  });
});
