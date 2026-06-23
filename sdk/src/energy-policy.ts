// DPO2U — Energy (ANEEL/CCEE) sectoral pack. The energy layer is mostly
// attestation/oracle, not self-contained numeric predicates (verified 2026-06-23):
//   - PLD-range is a deterministic oracle check (PLDmin ≤ price ≤ PLDmax).
//   - comercializadora authorization, consumer eligibility, and CCEE lastro are
//     SIGNED ATTESTATIONS the gate carries and enforces fail-closed.
//
// Legal basis:
//   - Lei 9.074/1995 (mercado livre); Portaria GM/MME 50/2022 (Grupo A no ACL desde 01/01/2024).
//   - PLD limits: REN ANEEL 1.032/2022 (floor + structural/hourly ceilings, IPCA-adjusted yearly).
//   - Art. 11 Lei 14.300/2022: anti-double-counting (energia já contabilizada na CCEE) — o risco
//     nº 1 da tokenização (lastro/dupla-venda).

import { createHash } from 'node:crypto';
import type { Verdict } from './types.js';
import { SdkError } from './types.js';
import type { PredicateResult, PolicyEvaluation, PolicyAction } from './bcb-policy.js';

export const ENERGY_PREDICATE_REGISTRY = [
  { id: 'energy_pld_range', citation: 'REN ANEEL 1.032/2022', deterministic: true,
    desc: 'Preço de liquidação ∈ [PLDmin, PLDmax] do feed oficial CCEE.' },
  { id: 'energy_comercializadora', citation: 'Lei 9.074/1995 + habilitação CCEE', deterministic: false,
    desc: 'Trader é comercializadora autorizada ANEEL e habilitada na CCEE.' },
  { id: 'energy_consumer_eligibility', citation: 'Portaria GM/MME 50/2022', deterministic: false,
    desc: 'Consumidor é elegível ao ACL (Grupo A desde 01/01/2024; Grupo B não).' },
  { id: 'energy_lastro_ccee', citation: 'Art. 11 Lei 14.300/2022 (anti-dupla-contagem)', deterministic: false,
    desc: 'Lastro registrado na CCEE e NÃO duplo-contado (risco nº 1 da tokenização).' },
] as const;

export interface EnergyPldEvidence {
  /** PLD used in the settlement and the regulated bounds, all in centavos/MWh. */
  readonly priceCentavosPerMwh: string;
  readonly pldMinCentavosPerMwh: string;
  readonly pldMaxCentavosPerMwh: string;
  /** Provenance of the value (e.g. 'CCEE'). Recorded for audit. */
  readonly feedSource: string;
}
export interface EnergyComercializadoraEvidence {
  readonly subjectId: string;
  readonly authorizedAneel: boolean;
  readonly habilitatedCcee: boolean;
  readonly ref?: string;
}
export interface EnergyConsumerEvidence {
  readonly consumerId: string;
  readonly group: 'A' | 'B';
  readonly eligible: boolean;
  readonly ref?: string;
}
export interface EnergyLastroEvidence {
  readonly contractRef: string;
  readonly cceeRegistered: boolean;
  readonly notDoubleCounted: boolean;
  readonly ref?: string;
}
export interface EnergyAclEvidence {
  readonly pld?: EnergyPldEvidence;
  readonly comercializadora?: EnergyComercializadoraEvidence;
  readonly consumer?: EnergyConsumerEvidence;
  readonly lastro?: EnergyLastroEvidence;
}

const ACCEPTED_PLD_SOURCES = new Set(['CCEE', 'ccee']);
const ENERGY_PREDICATE_SET = 'energy_acl_v1';
const PREDICATE_VERSION = 1;

function toBaseUnits(value: string, field: string): bigint {
  if (!/^\d+$/.test(value)) throw new SdkError(`${field} must be a non-negative integer string`, 'INVALID_INPUT');
  return BigInt(value);
}
function aggregate(results: PredicateResult[]): Verdict {
  if (results.some((r) => r.verdict === 'FAIL')) return 'FAIL';
  if (results.some((r) => r.verdict === 'REVIEW')) return 'REVIEW';
  return 'PASS';
}
function evidenceHash(action: PolicyAction, predicateSet: string, verdict: Verdict): string {
  const canonical = JSON.stringify({
    kind: action.kind, subject: action.subject, timestampIso: action.timestampIso, predicateSet, verdict,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function evalPld(ev: EnergyPldEvidence): PredicateResult {
  const base = { id: 'energy_pld_range', citation: 'REN ANEEL 1.032/2022', deterministic: true };
  const price = toBaseUnits(ev.priceCentavosPerMwh, 'price');
  const min = toBaseUnits(ev.pldMinCentavosPerMwh, 'pldMin');
  const max = toBaseUnits(ev.pldMaxCentavosPerMwh, 'pldMax');
  if (!ACCEPTED_PLD_SOURCES.has(ev.feedSource))
    return { ...base, verdict: 'REVIEW', reason: `procedência do PLD não reconhecida (${ev.feedSource})` };
  if (price < min) return { ...base, verdict: 'FAIL', reason: 'PLD abaixo do piso regulado (PLDmin)' };
  if (price > max) return { ...base, verdict: 'FAIL', reason: 'PLD acima do teto regulado (PLDmax)' };
  return { ...base, verdict: 'PASS', reason: `PLD ∈ [PLDmin, PLDmax] (feed ${ev.feedSource})` };
}
function evalComercializadora(ev: EnergyComercializadoraEvidence): PredicateResult {
  const base = { id: 'energy_comercializadora', citation: 'Lei 9.074/1995 + habilitação CCEE', deterministic: false };
  if (ev.authorizedAneel && ev.habilitatedCcee)
    return { ...base, verdict: 'PASS', reason: `autorizada ANEEL + habilitada CCEE (${ev.ref ?? 'ref n/d'})` };
  return { ...base, verdict: 'FAIL', reason: `falta ${!ev.authorizedAneel ? 'autorização ANEEL' : 'habilitação CCEE'}` };
}
function evalConsumer(ev: EnergyConsumerEvidence): PredicateResult {
  const base = { id: 'energy_consumer_eligibility', citation: 'Portaria GM/MME 50/2022', deterministic: false };
  if (ev.group === 'B') return { ...base, verdict: 'FAIL', reason: 'Grupo B (baixa tensão) não elegível ao ACL' };
  return ev.eligible
    ? { ...base, verdict: 'PASS', reason: 'consumidor Grupo A elegível ao ACL' }
    : { ...base, verdict: 'FAIL', reason: 'consumidor não atestado como elegível' };
}
function evalLastro(ev: EnergyLastroEvidence): PredicateResult {
  const base = { id: 'energy_lastro_ccee', citation: 'Art. 11 Lei 14.300/2022', deterministic: false };
  if (ev.cceeRegistered && ev.notDoubleCounted)
    return { ...base, verdict: 'PASS', reason: `lastro registrado na CCEE e não duplo-contado (${ev.contractRef})` };
  return { ...base, verdict: 'FAIL', reason: !ev.cceeRegistered ? 'lastro não registrado na CCEE' : 'lastro possivelmente duplo-contado (Art. 11)' };
}

/** Evaluate the Energy/ACL sectoral predicates present in the evidence. */
export function evaluateEnergyAcl(action: PolicyAction, ev: EnergyAclEvidence): PolicyEvaluation {
  const results: PredicateResult[] = [];
  if (ev.pld) results.push(evalPld(ev.pld));
  if (ev.comercializadora) results.push(evalComercializadora(ev.comercializadora));
  if (ev.consumer) results.push(evalConsumer(ev.consumer));
  if (ev.lastro) results.push(evalLastro(ev.lastro));
  if (results.length === 0) throw new SdkError('no energy predicates in evidence', 'INVALID_INPUT');
  const verdict = aggregate(results);
  return {
    verdict, predicateSet: ENERGY_PREDICATE_SET, predicateVersion: PREDICATE_VERSION, results,
    evidenceHashHex: evidenceHash(action, ENERGY_PREDICATE_SET, verdict),
  };
}
