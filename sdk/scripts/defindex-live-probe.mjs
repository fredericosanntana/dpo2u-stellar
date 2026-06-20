import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';

const baseUrl = process.env.DEFINDEX_API_URL || 'https://api.defindex.io';
const hasKey = Boolean(process.env.DEFINDEX_API_KEY);
const sdk = new DefindexSDK({
  apiKey: process.env.DEFINDEX_API_KEY,
  baseUrl,
  defaultNetwork: SupportedNetworks.TESTNET,
  timeout: 15000,
});

async function probe(name, fn) {
  try {
    const result = await fn();
    return { name, ok: true, result };
  } catch (error) {
    return {
      name,
      ok: false,
      message: error?.message || String(error),
      status: error?.status || error?.response?.status || null,
      data: error?.response?.data || null,
    };
  }
}

const out = {
  sdk: '@defindex/sdk@0.3.0',
  baseUrl,
  authHeader: hasKey ? 'present' : 'absent',
  probes: [],
};

out.probes.push(await probe('health', () => sdk.healthCheck()));
out.probes.push(await probe('factory:testnet', () => sdk.getFactoryAddress(SupportedNetworks.TESTNET)));
out.probes.push(await probe('factory:mainnet', () => sdk.getFactoryAddress(SupportedNetworks.MAINNET)));

console.log(JSON.stringify(out, null, 2));

const failed = out.probes.some((p) => !p.ok);
process.exit(failed ? 1 : 0);
