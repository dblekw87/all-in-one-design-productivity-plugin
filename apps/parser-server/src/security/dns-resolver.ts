import { lookup } from "node:dns/promises";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export interface DnsResolver {
  resolve(hostname: string): Promise<ResolvedAddress[]>;
}

export function createNodeDnsResolver(): DnsResolver {
  return {
    async resolve(hostname) {
      const addresses = await lookup(hostname, { all: true, verbatim: true });
      return addresses.map((address) => ({
        address: address.address,
        family: address.family as 4 | 6
      }));
    }
  };
}
