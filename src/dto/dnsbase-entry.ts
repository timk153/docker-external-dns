import { IsEnum, IsFQDN } from 'class-validator';

/**
 * Types of DNS entry supported
 */
export enum DNSTypes {
  A,
  CNAME,
  MX,
  NS,
}

/**
 * The base type for all DNS entries
 */
export abstract class DnsbaseEntry {
  @IsEnum(DNSTypes)
  type: DNSTypes;

  @IsFQDN()
  name: string;
}
