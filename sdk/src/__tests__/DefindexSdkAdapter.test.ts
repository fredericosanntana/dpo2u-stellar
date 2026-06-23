import { describe, expect, it, vi } from 'vitest';
import type { SupportedNetworks } from '@defindex/sdk';
import { DefindexSdkAdapter } from '../DefindexSdkAdapter.js';
import type {
  CreateVaultRequest,
  DistributeFeesRequest,
  RebalanceRequest,
  RescueRequest,
  StrategyToggleRequest,
} from '../defindex-policy-types.js';
import { SdkError } from '../types.js';

const TX = {
  xdr: 'AAAA-defindex-xdr',
  simulationResponse: { ok: true },
};

function fakeSdk() {
  return {
    createVault: vi.fn(async (_config, _network) => TX),
    rebalanceVault: vi.fn(async (_vault, _config, _network) => ({
      ...TX,
      functionName: 'rebalance',
      params: [],
    })),
    emergencyRescue: vi.fn(async (_vault, _config, _network) => ({
      ...TX,
      functionName: 'rescue',
      params: [],
    })),
    pauseStrategy: vi.fn(async (_vault, _config, _network) => ({
      ...TX,
      functionName: 'pause_strategy',
      params: [],
    })),
    unpauseStrategy: vi.fn(async (_vault, _config, _network) => ({
      ...TX,
      functionName: 'unpause_strategy',
      params: [],
    })),
    distributeVaultFees: vi.fn(async (_vault, _config, _network) => ({
      ...TX,
      functionName: 'distribute_fees',
      params: [],
    })),
  };
}

const createReq: CreateVaultRequest = {
  roles: {
    manager: 'GMANAGER',
    emergencyManager: 'GEMERGENCY',
    rebalanceManager: 'GREBAL',
    feeReceiver: 'GFEE',
  },
  name: 'Institutional Vault',
  symbol: 'IVLT',
  assets: [
    {
      asset: 'CASSET',
      strategies: [{ address: 'CSTRAT1', name: 'blend', paused: true }],
    },
  ],
  vaultFeeBps: 150,
  caller: 'GMANAGER',
  upgradable: true,
};

const rebalanceReq: RebalanceRequest = {
  vault: 'CVAULT',
  caller: 'GREBAL',
  instructions: [
    { action: 'invest', strategy: 'CSTRAT1', amount: '1000' },
    { action: 'unwind', strategy: 'CSTRAT2', amount: '500' },
    {
      action: 'swapExactIn',
      tokenIn: 'CTOKENIN',
      tokenOut: 'CTOKENOUT',
      amount: '250',
      slippageToleranceBps: 100,
      deadline: 1234567890,
    },
  ],
};

const rescueReq: RescueRequest = {
  vault: 'CVAULT',
  strategy: 'CSTRAT1',
  caller: 'GEMERGENCY',
};

const pauseReq: StrategyToggleRequest = {
  vault: 'CVAULT',
  strategy: 'CSTRAT1',
  caller: 'GEMERGENCY',
};

const feesReq: DistributeFeesRequest = {
  vault: 'CVAULT',
  caller: 'GFEE',
};

describe('DefindexSdkAdapter', () => {
  it('maps createVault to @defindex/sdk and returns PreparedTransaction', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({
      sdk,
      defaultNetwork: 'testnet' as SupportedNetworks,
    });

    const out = await adapter.createVault(createReq);

    expect(sdk.createVault).toHaveBeenCalledWith(
      {
        caller: 'GMANAGER',
        roles: createReq.roles,
        vaultFeeBps: 150,
        name: 'Institutional Vault',
        symbol: 'IVLT',
        upgradable: true,
        assets: [{ address: 'CASSET', strategies: [{ address: 'CSTRAT1', name: 'blend', paused: true }] }],
      },
      'testnet',
    );
    expect(out).toEqual({
      unsignedXdr: 'AAAA-defindex-xdr',
      description: 'create DeFindex vault',
      network: 'testnet',
    });
  });

  it('defaults createVault.upgradable to false when omitted', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk });

    await adapter.createVault({ ...createReq, upgradable: undefined });

    expect(sdk.createVault.mock.calls[0][0].upgradable).toBe(false);
  });

  it('maps rebalance Invest/Unwind/SwapExactIn instructions', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk, defaultNetwork: 'mainnet' as SupportedNetworks });

    const out = await adapter.rebalance(rebalanceReq);

    expect(sdk.rebalanceVault).toHaveBeenCalledWith(
      'CVAULT',
      {
        caller: 'GREBAL',
        instructions: [
          { type: 'Invest', strategy_address: 'CSTRAT1', amount: 1000 },
          { type: 'Unwind', strategy_address: 'CSTRAT2', amount: 500 },
          {
            type: 'SwapExactIn',
            token_in: 'CTOKENIN',
            token_out: 'CTOKENOUT',
            amount: 250,
            slippageToleranceBps: 100,
            deadline: 1234567890,
          },
        ],
      },
      'mainnet',
    );
    expect(out.description).toContain('rebalance DeFindex vault CVAULT');
    expect(out.network).toBe('mainnet');
  });

  it('maps emergencyRescue correctly', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk, defaultNetwork: 'testnet' as SupportedNetworks });

    await adapter.emergencyRescue(rescueReq);

    expect(sdk.emergencyRescue).toHaveBeenCalledWith(
      'CVAULT',
      { caller: 'GEMERGENCY', strategy_address: 'CSTRAT1' },
      'testnet',
    );
  });

  it('maps pause/unpause strategy correctly', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk, defaultNetwork: 'testnet' as SupportedNetworks });

    await adapter.pauseStrategy(pauseReq);
    await adapter.unpauseStrategy(pauseReq);

    expect(sdk.pauseStrategy).toHaveBeenCalledWith(
      'CVAULT',
      { caller: 'GEMERGENCY', strategy_address: 'CSTRAT1' },
      'testnet',
    );
    expect(sdk.unpauseStrategy).toHaveBeenCalledWith(
      'CVAULT',
      { caller: 'GEMERGENCY', strategy_address: 'CSTRAT1' },
      'testnet',
    );
  });

  it('maps distributeFees correctly', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk, defaultNetwork: 'testnet' as SupportedNetworks });

    const out = await adapter.distributeFees(feesReq);

    expect(sdk.distributeVaultFees).toHaveBeenCalledWith(
      'CVAULT',
      { caller: 'GFEE' },
      'testnet',
    );
    expect(out.description).toContain('distribute fees');
  });

  it('throws when DeFindex SDK returns null xdr', async () => {
    const sdk = fakeSdk();
    sdk.createVault.mockResolvedValueOnce({ xdr: null, simulationResponse: { ok: false } });
    const adapter = new DefindexSdkAdapter({ sdk });

    await expect(adapter.createVault(createReq)).rejects.toBeInstanceOf(SdkError);
  });

  it('throws on invalid rebalance amount strings', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk });

    await expect(
      adapter.rebalance({
        ...rebalanceReq,
        instructions: [{ action: 'invest', strategy: 'CSTRAT1', amount: '10.5' }],
      }),
    ).rejects.toBeInstanceOf(SdkError);
  });

  it('accepts the maximum JS-safe-integer amount (2^53-1)', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk, defaultNetwork: 'testnet' as SupportedNetworks });

    await adapter.rebalance({
      ...rebalanceReq,
      instructions: [{ action: 'invest', strategy: 'CSTRAT1', amount: '9007199254740991' }],
    });

    expect(sdk.rebalanceVault.mock.calls[0][1].instructions[0].amount).toBe(9007199254740991);
  });

  it('refuses amounts above the JS safe-integer range instead of silently rounding', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk });

    // 2^53+1: Number() rounds this to 2^53, which would sign an intent for the
    // WRONG value. The gate must fail closed, not coerce.
    await expect(
      adapter.rebalance({
        ...rebalanceReq,
        instructions: [{ action: 'invest', strategy: 'CSTRAT1', amount: '9007199254740993' }],
      }),
    ).rejects.toBeInstanceOf(SdkError);
    expect(sdk.rebalanceVault).not.toHaveBeenCalled();
  });

  it('rejects non-decimal amount strings (scientific notation, signs, hex, whitespace)', async () => {
    const sdk = fakeSdk();
    const adapter = new DefindexSdkAdapter({ sdk });

    for (const bad of ['1e10', '-5', '0x10', ' 10', '10 ', '']) {
      await expect(
        adapter.rebalance({
          ...rebalanceReq,
          instructions: [{ action: 'invest', strategy: 'CSTRAT1', amount: bad }],
        }),
      ).rejects.toBeInstanceOf(SdkError);
    }
    expect(sdk.rebalanceVault).not.toHaveBeenCalled();
  });

  it('can be constructed from config without injected sdk', () => {
    const adapter = new DefindexSdkAdapter({
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://api.defindex.io',
        defaultNetwork: 'testnet' as SupportedNetworks,
      },
    });

    expect(adapter).toBeInstanceOf(DefindexSdkAdapter);
  });
});
