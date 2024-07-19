import { validDnsAEntry } from './dto/dnsa-entry.spec';
import { DnsaEntry } from './dto/dnsa-entry';
import { validDnsCnameEntry } from './dto/dnscname-entry.spec';
import { DnsCnameEntry } from './dto/dnscname-entry';
import { DnsCnameCloudflareEntry } from './dto/dnscname-cloudflare-entry';
import { validDnsMxEntry } from './dto/dnsmx-entry.spec';
import { DnsMxEntry } from './dto/dnsmx-entry';
import { validDnsNsEntry } from './dto/dnsns-entry.spec';
import { DnsNsEntry } from './dto/dnsns-entry';
import { DnsUnsupportedCloudFlareEntry } from './dto/dnsunsupported-cloudflare-entry';
import { DNSTypes } from './dto/dnsbase-entry';
import { DnsaCloudflareEntry } from './dto/dnsa-cloudflare-entry';
import { DnsMxCloudflareEntry } from './dto/dnsmx-cloudflare-entry';
import { DnsNsCloudflareEntry } from './dto/dnsns-cloudflare-entry';
import { computeSetDifference } from './app.functions';

describe('AppFunctions', () => {
  describe('computeSetDifference', () => {
    it('should compute the set difference', () => {
      // arrange
      const toDeleteUnsupported = new DnsUnsupportedCloudFlareEntry();
      toDeleteUnsupported.id = 'unsupported-id';
      toDeleteUnsupported.name = 'unsupported';
      toDeleteUnsupported.type = DNSTypes.Unsupported;

      const entriesDockerToAdd = [
        validDnsAEntry(DnsaEntry, { name: 'to-add-a' }),
        validDnsCnameEntry(DnsCnameEntry, { name: 'to-add-cname' }),
      ];
      const entriesDockerToUpdate = [
        validDnsAEntry(DnsaEntry, { name: 'to-update-a' }),
        validDnsCnameEntry(DnsCnameEntry, { name: 'to-update-cname' }),
        validDnsMxEntry(DnsMxEntry, { name: 'to-update-mx' }),
        validDnsNsEntry(DnsNsEntry, { name: 'to-update-ns' }),
      ];
      const entriesCfToUpdate = [
        validDnsAEntry(DnsaCloudflareEntry, { name: 'to-update-a' }),
        validDnsCnameEntry(DnsCnameCloudflareEntry, {
          name: 'to-update-cname',
        }),
        validDnsMxEntry(DnsMxCloudflareEntry, { name: 'to-update-mx' }),
        validDnsNsEntry(DnsNsCloudflareEntry, { name: 'to-update-ns' }),
      ];
      [...entriesDockerToUpdate, ...entriesCfToUpdate].forEach((entry) =>
        jest.spyOn(entry, 'hasSameValue').mockReturnValue(false),
      );
      const entriesDockerUnchanged = [
        validDnsAEntry(DnsaEntry, { name: 'unchanged-a' }),
        validDnsCnameEntry(DnsCnameEntry, { name: 'unchanged-cname' }),
        validDnsMxEntry(DnsMxEntry, { name: 'unchanged-mx' }),
        validDnsNsEntry(DnsNsEntry, { name: 'unchanged-ns' }),
      ];
      const entriesCfUnchanged = [
        validDnsAEntry(DnsaCloudflareEntry, {
          id: 'unchanged-a-id',
          name: 'unchanged-a',
        }),
        validDnsCnameEntry(DnsCnameCloudflareEntry, {
          id: 'unchanged-cname-id',
          name: 'unchanged-cname',
        }),
        validDnsMxEntry(DnsMxCloudflareEntry, {
          id: 'unchanged-mx-id',
          name: 'unchanged-mx',
        }),
        validDnsNsEntry(DnsNsCloudflareEntry, {
          id: 'unchanged-ns-id',
          name: 'unchanged-ns',
        }),
      ];
      [...entriesDockerUnchanged, ...entriesCfUnchanged].forEach((entry) =>
        jest.spyOn(entry, 'hasSameValue').mockReturnValue(true),
      );
      const entriesCfToDelete = [
        validDnsCnameEntry(DnsCnameCloudflareEntry, {
          id: 'to-delete-id',
          name: 'to-delete',
        }),
        toDeleteUnsupported,
      ];
      // act
      const result = computeSetDifference(
        [
          ...entriesDockerToAdd,
          ...entriesDockerToUpdate,
          ...entriesDockerUnchanged,
        ],
        [...entriesCfToDelete, ...entriesCfToUpdate, ...entriesCfUnchanged],
      );

      // assert
      expect(result.add).toEqual(entriesDockerToAdd);
      expect(result.update).toEqual([
        { old: entriesCfToUpdate[0], update: entriesDockerToUpdate[0] },
        { old: entriesCfToUpdate[1], update: entriesDockerToUpdate[1] },
        { old: entriesCfToUpdate[2], update: entriesDockerToUpdate[2] },
        { old: entriesCfToUpdate[3], update: entriesDockerToUpdate[3] },
      ]);
      expect(result.delete).toEqual(entriesCfToDelete);
      expect(result.unchanged).toEqual(entriesCfUnchanged);
    });
  });
});
