import {
  DefindexSDK,
  type DefindexSDKConfig,
  type SupportedNetworks,
  type CreateVaultParams,
  type RebalanceParams,
  type RescueFromVaultParams,
  type PauseStrategyParams,
  type UnpauseStrategyParams,
  type DistributeFeesParams,
  type TransactionResponse,
  type VaultTransactionResponse,
} from '@defindex/sdk';
import { SdkError } from './types.js';
import type {
  CreateVaultRequest,
  DefindexOperatorClient,
  DistributeFeesRequest,
  PreparedTransaction,
  RebalanceInstruction,
  RebalanceRequest,
  RescueRequest,
  StrategyToggleRequest,
} from './defindex-policy-types.js';

export interface DefindexSdkAdapterOptions {
  readonly sdk?: DefindexSdkLike;
  readonly config?: DefindexSDKConfig;
  readonly defaultNetwork?: SupportedNetworks;
}

type DefindexSdkLike = Pick<
  DefindexSDK,
  | 'createVault'
  | 'rebalanceVault'
  | 'emergencyRescue'
  | 'pauseStrategy'
  | 'unpauseStrategy'
  | 'distributeVaultFees'
>;

/**
 * Thin truthful adapter from our DPO2U policy layer to the real @defindex/sdk.
 *
 * Scope: prepares unsigned operator transactions only. No signing, no broadcast,
 * no retail deposit gating.
 */
export class DefindexSdkAdapter implements DefindexOperatorClient {
  private readonly sdk: DefindexSdkLike;
  private readonly defaultNetwork?: SupportedNetworks;

  constructor(opts: DefindexSdkAdapterOptions) {
    if (opts.sdk) {
      this.sdk = opts.sdk;
      this.defaultNetwork = opts.defaultNetwork ?? opts.config?.defaultNetwork;
      return;
    }
    if (!opts.config) {
      throw new SdkError(
        'DefindexSdkAdapter requires either an injected sdk instance or config',
        'INVALID_INPUT',
      );
    }
    this.sdk = new DefindexSDK(opts.config);
    this.defaultNetwork = opts.defaultNetwork ?? opts.config.defaultNetwork;
  }

  async createVault(req: CreateVaultRequest): Promise<PreparedTransaction> {
    const payload: CreateVaultParams = {
      caller: req.caller,
      roles: req.roles,
      vaultFeeBps: req.vaultFeeBps,
      name: req.name,
      symbol: req.symbol,
      upgradable: req.upgradable ?? false,
      assets: req.assets.map((asset) => ({
        address: asset.asset,
        strategies: asset.strategies.map((strategy) => ({
          address: strategy.address,
          name: strategy.name,
          paused: strategy.paused ?? false,
        })),
      })),
    };
    const out = await this.sdk.createVault(payload, this.defaultNetwork);
    return toPrepared(out, 'create DeFindex vault', this.defaultNetwork);
  }

  async rebalance(req: RebalanceRequest): Promise<PreparedTransaction> {
    const payload: RebalanceParams = {
      caller: req.caller,
      instructions: req.instructions.map(mapInstruction),
    };
    const out = await this.sdk.rebalanceVault(req.vault, payload, this.defaultNetwork);
    return toPrepared(out, `rebalance DeFindex vault ${req.vault}`, this.defaultNetwork);
  }

  async emergencyRescue(req: RescueRequest): Promise<PreparedTransaction> {
    const payload: RescueFromVaultParams = {
      caller: req.caller,
      strategy_address: req.strategy,
    };
    const out = await this.sdk.emergencyRescue(req.vault, payload, this.defaultNetwork);
    return toPrepared(out, `emergency rescue on DeFindex vault ${req.vault}`, this.defaultNetwork);
  }

  async pauseStrategy(req: StrategyToggleRequest): Promise<PreparedTransaction> {
    const payload: PauseStrategyParams = {
      caller: req.caller,
      strategy_address: req.strategy,
    };
    const out = await this.sdk.pauseStrategy(req.vault, payload, this.defaultNetwork);
    return toPrepared(out, `pause strategy on DeFindex vault ${req.vault}`, this.defaultNetwork);
  }

  async unpauseStrategy(req: StrategyToggleRequest): Promise<PreparedTransaction> {
    const payload: UnpauseStrategyParams = {
      caller: req.caller,
      strategy_address: req.strategy,
    };
    const out = await this.sdk.unpauseStrategy(req.vault, payload, this.defaultNetwork);
    return toPrepared(out, `unpause strategy on DeFindex vault ${req.vault}`, this.defaultNetwork);
  }

  async distributeFees(req: DistributeFeesRequest): Promise<PreparedTransaction> {
    const payload: DistributeFeesParams = { caller: req.caller };
    const out = await this.sdk.distributeVaultFees(req.vault, payload, this.defaultNetwork);
    return toPrepared(out, `distribute fees on DeFindex vault ${req.vault}`, this.defaultNetwork);
  }
}

function mapInstruction(instruction: RebalanceInstruction): RebalanceParams['instructions'][number] {
  switch (instruction.action) {
    case 'invest':
      return {
        type: 'Invest',
        strategy_address: requiredString(instruction.strategy, 'strategy'),
        amount: parseAmount(instruction.amount, 'amount'),
      };
    case 'unwind':
      return {
        type: 'Unwind',
        strategy_address: requiredString(instruction.strategy, 'strategy'),
        amount: parseAmount(instruction.amount, 'amount'),
      };
    case 'swapExactIn':
      return {
        type: 'SwapExactIn',
        token_in: requiredString(instruction.tokenIn, 'tokenIn'),
        token_out: requiredString(instruction.tokenOut, 'tokenOut'),
        amount: parseAmount(instruction.amount, 'amount'),
        slippageToleranceBps: instruction.slippageToleranceBps,
        deadline: instruction.deadline,
      };
    case 'swapExactOut':
      return {
        type: 'SwapExactOut',
        token_in: requiredString(instruction.tokenIn, 'tokenIn'),
        token_out: requiredString(instruction.tokenOut, 'tokenOut'),
        amount: parseAmount(instruction.amount, 'amount'),
        slippageToleranceBps: instruction.slippageToleranceBps,
        deadline: instruction.deadline,
      };
  }
}

function toPrepared(
  response: TransactionResponse | VaultTransactionResponse,
  description: string,
  network?: SupportedNetworks,
): PreparedTransaction {
  if (!response.xdr) {
    throw new SdkError(
      `DeFindex SDK returned null xdr while preparing '${description}'`,
      'NETWORK',
      response,
    );
  }
  return {
    unsignedXdr: response.xdr,
    description,
    network: network ?? 'unspecified',
  };
}

function parseAmount(value: string | undefined, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
    throw new SdkError(`${field} must be a non-negative integer string`, 'INVALID_INPUT');
  }
  return num;
}

function requiredString(value: string | undefined, field: string): string {
  if (!value) {
    throw new SdkError(`${field} is required`, 'INVALID_INPUT');
  }
  return value;
}
