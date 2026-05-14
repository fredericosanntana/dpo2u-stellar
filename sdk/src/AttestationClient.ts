// Trustless verifier client.
//
// Uses Soroban RPC `simulateTransaction` to read `verify_attestation` from
// the contract without broadcasting. No wallet, no fee, no DPO2U-side state
// — anyone who can reach the public Stellar RPC can verify.
//
// PRD persona P4 (external auditor TCE/TCU/CGU) and P5 (citizen/journalist).

import {
  Account,
  BASE_FEE,
  Contract,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { SdkError, type AttestationRecord, type ClientConfig } from './types.js';
import { decodeAttestationRecord, hexToBytes32 } from './decoder.js';

const TIMEOUT_SECONDS = 30;
const SYMBOL_RE = /^[a-zA-Z0-9_]{1,32}$/;

export interface SorobanRpcLike {
  getAccount(publicKey: string): Promise<Account>;
  simulateTransaction(
    tx: ReturnType<TransactionBuilder['build']>,
  ): Promise<rpc.Api.SimulateTransactionResponse>;
}

export interface VerifyResult {
  readonly found: boolean;
  readonly record: AttestationRecord | null;
  readonly explorer_url: string;
  readonly contract_id: string;
  readonly network_passphrase: string;
}

export class AttestationClient {
  private readonly cfg: Required<Pick<ClientConfig, 'explorerBaseUrl'>> & ClientConfig;
  private readonly rpcServer: SorobanRpcLike;

  constructor(cfg: ClientConfig, rpcServer?: SorobanRpcLike) {
    this.cfg = {
      ...cfg,
      explorerBaseUrl:
        cfg.explorerBaseUrl ?? 'https://stellar.expert/explorer/testnet',
    };
    this.rpcServer = rpcServer ?? (new rpc.Server(cfg.rpcUrl) as SorobanRpcLike);
  }

  /**
   * Read-only verify. Returns the decoded record or `null` if no
   * attestation exists for that (use_case_id, evidence_hash) pair.
   */
  async verify(args: {
    useCaseId: string;
    evidenceHashHex: string;
  }): Promise<VerifyResult> {
    if (!SYMBOL_RE.test(args.useCaseId)) {
      throw new SdkError(
        `useCaseId must match /^[a-zA-Z0-9_]{1,32}$/`,
        'INVALID_INPUT',
      );
    }
    const hashBytes = hexToBytes32(args.evidenceHashHex);

    const contract = new Contract(this.cfg.contractId);
    const argsScv: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(args.useCaseId),
      xdr.ScVal.scvBytes(hashBytes),
    ];

    const account = await this.rpcServer.getAccount(this.cfg.viewerAccount);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.cfg.networkPassphrase,
    })
      .addOperation(contract.call('verify_attestation', ...argsScv))
      .setTimeout(TIMEOUT_SECONDS)
      .build();

    const sim = await this.rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new SdkError(
        `verify simulation failed: ${sim.error}`,
        'SIMULATION_FAILED',
        sim,
      );
    }
    const retval = 'result' in sim && sim.result?.retval ? sim.result.retval : null;
    const record = decodeAttestationRecord(retval);

    return {
      found: record !== null,
      record,
      explorer_url: `${this.cfg.explorerBaseUrl}/contract/${this.cfg.contractId}`,
      contract_id: this.cfg.contractId,
      network_passphrase: this.cfg.networkPassphrase,
    };
  }
}

/**
 * Preset for the deployed testnet contract.
 *   Contract ID: CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5
 * Override `viewerAccount` if you have your own funded testnet account;
 * the default uses the public friendbot-funded deployer.
 */
export function testnetClient(overrides: Partial<ClientConfig> = {}): ClientConfig {
  return {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET,
    contractId:
      overrides.contractId ?? 'CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5',
    viewerAccount:
      overrides.viewerAccount ??
      'GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN',
    explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
    ...overrides,
  };
}
