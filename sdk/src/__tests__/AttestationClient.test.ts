import { describe, it, expect } from 'vitest';
import { Account, Address, Keypair, Networks, rpc, xdr } from '@stellar/stellar-sdk';
import { AttestationClient, testnetClient, type SorobanRpcLike } from '../AttestationClient.js';
import { SdkError } from '../types.js';

const VIEWER = Keypair.random().publicKey();

function makeRpc(retval: xdr.ScVal | null, opts: { simulationError?: string } = {}): SorobanRpcLike {
  return {
    async getAccount() {
      return new Account(VIEWER, '0');
    },
    async simulateTransaction() {
      if (opts.simulationError) {
        return { error: opts.simulationError } as unknown as rpc.Api.SimulateTransactionResponse;
      }
      if (retval === null) {
        return { result: undefined } as unknown as rpc.Api.SimulateTransactionResponse;
      }
      return { result: { retval } } as unknown as rpc.Api.SimulateTransactionResponse;
    },
  };
}

function makeRecord(): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('verdict'),
      val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Pass')]),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('predicate_set'),
      val: xdr.ScVal.scvSymbol('bank_change_v1'),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('predicate_version'),
      val: xdr.ScVal.scvU32(1),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('submitted_by'),
      val: new Address(VIEWER).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('timestamp'),
      val: xdr.ScVal.scvU64(new xdr.Uint64(1_700_000_000n)),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('metadata_hash'),
      val: xdr.ScVal.scvBytes(Buffer.from('a'.repeat(64), 'hex')),
    }),
  ]);
}

const cfg = testnetClient({ viewerAccount: VIEWER });

describe('AttestationClient.verify', () => {
  it('reports found=false when contract returns Option::None', async () => {
    const client = new AttestationClient(cfg, makeRpc(xdr.ScVal.scvVoid()));
    const r = await client.verify({
      useCaseId: 'bank_change_v1',
      evidenceHashHex: 'a'.repeat(64),
    });
    expect(r.found).toBe(false);
    expect(r.record).toBeNull();
    expect(r.contract_id).toBe(cfg.contractId);
    expect(r.network_passphrase).toBe(Networks.TESTNET);
    expect(r.explorer_url).toContain(cfg.contractId);
  });

  it('returns decoded record on hit', async () => {
    const client = new AttestationClient(cfg, makeRpc(makeRecord()));
    const r = await client.verify({
      useCaseId: 'bank_change_v1',
      evidenceHashHex: 'a'.repeat(64),
    });
    expect(r.found).toBe(true);
    expect(r.record!.verdict).toBe('PASS');
    expect(r.record!.predicate_set).toBe('bank_change_v1');
    expect(r.record!.predicate_version).toBe(1);
  });

  it('rejects malformed useCaseId', async () => {
    const client = new AttestationClient(cfg, makeRpc(null));
    await expect(
      client.verify({ useCaseId: 'has space', evidenceHashHex: 'a'.repeat(64) }),
    ).rejects.toThrow(SdkError);
    await expect(
      client.verify({ useCaseId: '', evidenceHashHex: 'a'.repeat(64) }),
    ).rejects.toThrow(SdkError);
  });

  it('rejects malformed evidence_hash', async () => {
    const client = new AttestationClient(cfg, makeRpc(null));
    await expect(
      client.verify({ useCaseId: 'uc1', evidenceHashHex: 'a'.repeat(63) }),
    ).rejects.toThrow(SdkError);
    await expect(
      client.verify({ useCaseId: 'uc1', evidenceHashHex: 'z'.repeat(64) }),
    ).rejects.toThrow(SdkError);
  });

  it('surfaces simulation errors as SdkError', async () => {
    // Mock isSimulationError to recognise our shape.
    const client = new AttestationClient(cfg, {
      async getAccount() {
        return new Account(VIEWER, '0');
      },
      async simulateTransaction() {
        return { error: 'host error: ContractError 4' } as unknown as rpc.Api.SimulateTransactionResponse;
      },
    });
    await expect(
      client.verify({ useCaseId: 'bank_change_v1', evidenceHashHex: 'a'.repeat(64) }),
    ).rejects.toThrow(/simulation failed/);
  });
});

describe('testnetClient', () => {
  it('points at the deployed contract by default', () => {
    const c = testnetClient();
    expect(c.contractId).toBe('CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5');
    expect(c.networkPassphrase).toBe('Test SDF Network ; September 2015');
    expect(c.rpcUrl).toContain('testnet');
  });
  it('respects overrides', () => {
    const c = testnetClient({
      contractId: 'CCUSTOMID',
      viewerAccount: 'GVIEWER',
    });
    expect(c.contractId).toBe('CCUSTOMID');
    expect(c.viewerAccount).toBe('GVIEWER');
  });
});
