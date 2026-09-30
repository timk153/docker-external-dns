import { DnsbaseEntry, ICloudFlareEntry } from './dto/dnsbase-entry';

/**
 * Represents the DNS Entries set difference
 */
export type SetDifference = {
  unchanged: ICloudFlareEntry[];
  add: DnsbaseEntry[];
  update: {
    old: ICloudFlareEntry;
    update: DnsbaseEntry;
  }[];
  delete: ICloudFlareEntry[];
};

/**
 * Given a set of DNS entrie from docker and a set from cludflare.
 * Compares them to calculate the set difference.
 *
 * Reults in separate arrays for entries to be
 * - unchanged
 * - added
 * - updated
 * - deleted
 *
 * @param dockerEntries Entries from docker
 * @param cloudFlareEntries Entries from cloudflare
 * @returns {SetDifference} The set difference
 */
export function computeSetDifference(
  dockerEntries: DnsbaseEntry[],
  cloudFlareEntries: ICloudFlareEntry[],
): SetDifference {
  // build index from docker entries
  const dockerEntryIndex = dockerEntries.reduce(
    (previous, current) => {
      const { Key } = current;
      return { ...previous, [Key]: current };
    },
    {} as { [key: string]: DnsbaseEntry },
  );
  // build index of matching cf entries
  const matchingIndex = cloudFlareEntries.reduce(
    (previous, current) => {
      const { Key } = current;
      return {
        ...previous,
        [Key]: { cloudFlare: current, docker: dockerEntryIndex[Key] },
      };
    },
    {} as {
      [key: string]: {
        docker: DnsbaseEntry;
        cloudFlare: ICloudFlareEntry;
      };
    },
  );
  // build the result
  const result: SetDifference = {
    add: Object.entries(dockerEntryIndex)
      .filter(([key]) => {
        return matchingIndex[key] === undefined;
      })
      .map(([, value]) => value),
    update: [],
    delete: [],
    unchanged: [],
  };
  // calculate update and delete
  Object.entries(matchingIndex).forEach(([, { docker, cloudFlare }]) => {
    // compute delete
    if (docker === undefined && cloudFlare !== undefined) {
      result.delete.push(cloudFlare);
      return;
    }
    // compute update
    if (docker.hasSameValue(cloudFlare)) {
      result.unchanged.push(cloudFlare);
    } else {
      result.update.push({ old: cloudFlare, update: docker });
    }
  });
  return result;
}
