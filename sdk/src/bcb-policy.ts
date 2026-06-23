// DPO2U — BCB/VASP + CVM (RCVM 88) compliance pack: the Category-A predicates
// that are objectively/numerically verifiable and fit the proof-bound gate as a
// PASS/FAIL/REVIEW verdict bound to the exact action (TOCTOU).
//
// Legal basis (verified 2026-06-23, fontes primárias):
//   - Lei 14.478/2022 Art. 2º (autorização prévia de PSAV) + Decreto 11.563/2023 (BCB).
//   - Res. BCB 520 (vig. 02/02/2026): Art. 30 I (segregação), Art. 30 §3º II (buffer 5%),
//     corte de contraparte 30/10/2026. (NB: NÃO há PoR diária/mensal — só auditoria bienal.)
//   - Res. CVM 88: Art. 4º (teto retail R$20k/ano intra-plataforma), Art. 3º I (teto emissor
//     R$15M + janela 180d), Art. 3º §5º (cooldown 120d).
//
// What this pack does NOT decide (Category B — needs an off-chain attester/oracle):
//   security classification (Howey/Parecer 40), binding an authorized legal entity to a
//   wallet key, cross-platform retail aggregation, PoR holdings. Those enter as a signed
//   attestation boolean in the evidence, never as a self-contained on-chain fact.

import { createHash } from 'node:crypto';
import type { Verdict } from './types.js';
import { SdkError } from './types.js';

export type PredicateVerdict = Verdict; // 'PASS' | 'FAIL' | 'REVIEW'

/** One predicate's outcome, with its legal citation and on-chain nature. */
export interface PredicateResult {
  readonly id: string;
  readonly verdict: PredicateVerdict;
  readonly citation: string;
  readonly reason: string;
  /** true = deterministic Category-A predicate; false = depends on an off-chain attestation. */
  readonly deterministic: boolean;
}

/** Aggregate evaluation, ready to become the gate's attestation verdict + evidence hash. */
export interface PolicyEvaluation {
  readonly verdict: Verdict;
  readonly predicateSet: string;
  readonly predicateVersion: number;
  readonly results: readonly PredicateResult[];
  /** sha256 bound to the action + verdict + predicate set (TOCTOU). */
  readonly evidenceHashHex: string;
}

/** The privileged action being gated (what the evidence binds to). */
export interface PolicyAction {
  readonly kind: string;
  readonly subject: string;
  readonly timestampIso: string;
}

// ── Constants (centavos / base units; ratios as integers to avoid float drift) ─
export const CVM_RETAIL_CAP_CENTAVOS = 2_000_000n; // R$ 20.000,00
export const CVM_ISSUER_CAP_CENTAVOS = 1_500_000_000n; // R$ 15.000.000,00
export const CVM_CAPTURE_MAX_DAYS = 180;
export const CVM_COOLDOWN_DAYS = 120;
export const BCB_BUFFER_RATIO_DENOMINATOR = 20n; // 5% == 1/20
export const BCB_COUNTERPARTY_CUTOFF_ISO = '2026-10-30';

/** Registry — every predicate, its citation, and whether it is self-contained on-chain. */
export const PREDICATE_REGISTRY = [
  { id: 'bcb_segregation', citation: 'Res. BCB 520 Art. 30 I', deterministic: true,
    desc: 'Ativos de cliente em carteiras distintas das da prestadora; controles independentes.' },
  { id: 'bcb_buffer_5pct', citation: 'Res. BCB 520 Art. 30 §3º II', deterministic: true,
    desc: 'Buffer da prestadora ≤ 5% do total de ativos de clientes.' },
  { id: 'bcb_operator_admission', citation: 'Lei 14.478/2022 Art. 2º', deterministic: false,
    desc: 'Operador é PSAV autorizado/em-processo (atestação do registro BCB).' },
  { id: 'bcb_counterparty_admission', citation: 'Res. BCB 520 (corte 30/10/2026)', deterministic: false,
    desc: 'Contraparte autorizada/em-processo; exigido a partir de 30/10/2026.' },
  { id: 'cvm_rcvm88_retail_cap', citation: 'Res. CVM 88 Art. 4º', deterministic: true,
    desc: 'Aporte retail intra-plataforma ≤ R$20.000/ano (exceto qualificado/líder/renda>R$200k).' },
  { id: 'cvm_rcvm88_issuer_cap', citation: 'Res. CVM 88 Art. 3º I', deterministic: true,
    desc: 'Captação (atual + ano anterior) ≤ R$15.000.000.' },
  { id: 'cvm_rcvm88_capture_window', citation: 'Res. CVM 88 Art. 3º I', deterministic: true,
    desc: 'Janela de captação ≤ 180 dias.' },
  { id: 'cvm_rcvm88_cooldown', citation: 'Res. CVM 88 Art. 3º §5º', deterministic: true,
    desc: 'Cooldown ≥ 120 dias entre ofertas dispensadas bem-sucedidas.' },
] as const;

// ── Evidence payloads ────────────────────────────────────────────────────────
export interface BcbSegregationEvidence {
  readonly clientWallets: readonly string[];
  readonly providerWallets: readonly string[];
  /** Art. 30 I: controles sobre carteiras da prestadora não podem afetar as de clientes. */
  readonly controlIndependent: boolean;
}
export interface BcbBufferEvidence {
  readonly providerAssetsInClientWalletsBaseUnits: string;
  readonly totalClientAssetsBaseUnits: string;
}
export interface BcbAdmissionEvidence {
  readonly subjectId: string;
  /** From an off-chain BCB-registry attestation (Category B input). */
  readonly authorized: boolean;
  readonly authorizationRef?: string;
}
export type CvmInvestorProfile = 'retail' | 'qualified' | 'lead' | 'high_income';
export interface CvmRetailEvidence {
  readonly investorId: string;
  readonly investorProfile: CvmInvestorProfile;
  readonly ytdInvestedCentavos: string; // intra-platform YTD (on-chain)
  readonly investmentCentavos: string;
  /** Cross-platform aggregate (Anexo C) is a self-declaration — off-chain. */
  readonly crossPlatformSelfDeclared?: boolean;
}
export interface CvmIssuerEvidence {
  readonly issuerCnpj: string;
  readonly offeringTargetCentavos: string;
  readonly priorYearCapturedCentavos: string;
  readonly captureWindowDays: number;
  /** ISO date the issuer's last successful exempt offering ended (for cooldown). */
  readonly lastSuccessfulOfferingEndIso?: string;
}

export interface BcbVaspEvidence {
  readonly segregation?: BcbSegregationEvidence;
  readonly buffer?: BcbBufferEvidence;
  readonly operator?: BcbAdmissionEvidence;
  readonly counterparty?: BcbAdmissionEvidence;
}
export interface CvmRcvm88Evidence {
  readonly retail?: CvmRetailEvidence;
  readonly issuer?: CvmIssuerEvidence;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function toBaseUnits(value: string, field: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new SdkError(`${field} must be a non-negative integer string (base units)`, 'INVALID_INPUT');
  }
  return BigInt(value);
}
function dayDiff(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (Number.isNaN(a) || Number.isNaN(b)) throw new SdkError('invalid ISO date', 'INVALID_INPUT');
  return Math.floor((b - a) / 86_400_000);
}
function aggregate(results: PredicateResult[]): Verdict {
  if (results.some((r) => r.verdict === 'FAIL')) return 'FAIL';
  if (results.some((r) => r.verdict === 'REVIEW')) return 'REVIEW';
  return 'PASS';
}
function evidenceHash(action: PolicyAction, predicateSet: string, verdict: Verdict): string {
  const canonical = JSON.stringify({
    kind: action.kind, subject: action.subject, timestampIso: action.timestampIso,
    predicateSet, verdict,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

// ── Individual predicate evaluators ──────────────────────────────────────────
function evalSegregation(ev: BcbSegregationEvidence): PredicateResult {
  const base = { id: 'bcb_segregation', citation: 'Res. BCB 520 Art. 30 I', deterministic: true };
  const overlap = ev.clientWallets.filter((w) => ev.providerWallets.includes(w));
  if (overlap.length > 0)
    return { ...base, verdict: 'FAIL', reason: `carteira(s) compartilhada(s): ${overlap.join(', ')}` };
  if (!ev.controlIndependent)
    return { ...base, verdict: 'FAIL', reason: 'controle das carteiras da prestadora pode afetar as de clientes' };
  return { ...base, verdict: 'PASS', reason: 'carteiras de cliente distintas e controle independente' };
}
function evalBuffer(ev: BcbBufferEvidence): PredicateResult {
  const base = { id: 'bcb_buffer_5pct', citation: 'Res. BCB 520 Art. 30 §3º II', deterministic: true };
  const provider = toBaseUnits(ev.providerAssetsInClientWalletsBaseUnits, 'providerAssets');
  const total = toBaseUnits(ev.totalClientAssetsBaseUnits, 'totalClientAssets');
  if (total === 0n)
    return provider === 0n
      ? { ...base, verdict: 'PASS', reason: 'sem ativos de clientes e sem buffer' }
      : { ...base, verdict: 'FAIL', reason: 'buffer da prestadora sem ativos de clientes' };
  // provider/total ≤ 5% ⟺ provider * 20 ≤ total
  return provider * BCB_BUFFER_RATIO_DENOMINATOR <= total
    ? { ...base, verdict: 'PASS', reason: 'buffer ≤ 5% do total de clientes' }
    : { ...base, verdict: 'FAIL', reason: 'buffer da prestadora excede 5% do total de clientes' };
}
function evalOperator(ev: BcbAdmissionEvidence): PredicateResult {
  const base = { id: 'bcb_operator_admission', citation: 'Lei 14.478/2022 Art. 2º', deterministic: false };
  return ev.authorized
    ? { ...base, verdict: 'PASS', reason: `operador autorizado (${ev.authorizationRef ?? 'ref n/d'})` }
    : { ...base, verdict: 'FAIL', reason: 'operador não autorizado pelo BCB' };
}
function evalCounterparty(ev: BcbAdmissionEvidence, actionIso: string): PredicateResult {
  const base = { id: 'bcb_counterparty_admission', citation: 'Res. BCB 520 (corte 30/10/2026)', deterministic: false };
  const enforced = Date.parse(actionIso) >= Date.parse(BCB_COUNTERPARTY_CUTOFF_ISO);
  if (ev.authorized) return { ...base, verdict: 'PASS', reason: 'contraparte autorizada/em-processo' };
  return enforced
    ? { ...base, verdict: 'FAIL', reason: 'contraparte não autorizada (vedado a partir de 30/10/2026)' }
    : { ...base, verdict: 'REVIEW', reason: 'contraparte não autorizada; corte só entra em vigor 30/10/2026' };
}
function evalRetail(ev: CvmRetailEvidence): PredicateResult {
  const base = { id: 'cvm_rcvm88_retail_cap', citation: 'Res. CVM 88 Art. 4º', deterministic: true };
  if (ev.investorProfile !== 'retail')
    return { ...base, verdict: 'PASS', reason: `perfil isento do teto (${ev.investorProfile})` };
  const ytd = toBaseUnits(ev.ytdInvestedCentavos, 'ytdInvested');
  const inv = toBaseUnits(ev.investmentCentavos, 'investment');
  if (ytd + inv > CVM_RETAIL_CAP_CENTAVOS)
    return { ...base, verdict: 'FAIL', reason: 'aporte intra-plataforma excede R$20.000/ano' };
  // within-platform cap holds; cross-platform aggregate is an off-chain self-declaration
  if (ev.crossPlatformSelfDeclared !== true)
    return { ...base, verdict: 'REVIEW', reason: 'teto intra-plataforma ok; falta auto-declaração cross-plataforma (Anexo C)' };
  return { ...base, verdict: 'PASS', reason: 'aporte ≤ R$20.000/ano e auto-declaração cross-plataforma presente' };
}
function evalIssuerCap(ev: CvmIssuerEvidence): PredicateResult {
  const base = { id: 'cvm_rcvm88_issuer_cap', citation: 'Res. CVM 88 Art. 3º I', deterministic: true };
  const target = toBaseUnits(ev.offeringTargetCentavos, 'offeringTarget');
  const prior = toBaseUnits(ev.priorYearCapturedCentavos, 'priorYearCaptured');
  return target + prior <= CVM_ISSUER_CAP_CENTAVOS
    ? { ...base, verdict: 'PASS', reason: 'captação (atual+anterior) ≤ R$15M' }
    : { ...base, verdict: 'FAIL', reason: 'captação (atual+anterior) excede R$15M' };
}
function evalCaptureWindow(ev: CvmIssuerEvidence): PredicateResult {
  const base = { id: 'cvm_rcvm88_capture_window', citation: 'Res. CVM 88 Art. 3º I', deterministic: true };
  return ev.captureWindowDays <= CVM_CAPTURE_MAX_DAYS
    ? { ...base, verdict: 'PASS', reason: 'janela ≤ 180 dias' }
    : { ...base, verdict: 'FAIL', reason: 'janela de captação excede 180 dias' };
}
function evalCooldown(ev: CvmIssuerEvidence, actionIso: string): PredicateResult {
  const base = { id: 'cvm_rcvm88_cooldown', citation: 'Res. CVM 88 Art. 3º §5º', deterministic: true };
  if (!ev.lastSuccessfulOfferingEndIso)
    return { ...base, verdict: 'PASS', reason: 'sem oferta anterior — cooldown não aplica' };
  const elapsed = dayDiff(ev.lastSuccessfulOfferingEndIso, actionIso);
  return elapsed >= CVM_COOLDOWN_DAYS
    ? { ...base, verdict: 'PASS', reason: `cooldown cumprido (${elapsed}d ≥ 120d)` }
    : { ...base, verdict: 'FAIL', reason: `cooldown não cumprido (${elapsed}d < 120d)` };
}

// ── Pack evaluators ──────────────────────────────────────────────────────────
const BCB_PREDICATE_SET = 'bcb_vasp_v1';
const CVM_PREDICATE_SET = 'cvm_rcvm88_v1';
const PREDICATE_VERSION = 1;

/** Evaluate the BCB/VASP Category-A predicates present in the evidence. */
export function evaluateBcbVasp(action: PolicyAction, ev: BcbVaspEvidence): PolicyEvaluation {
  const results: PredicateResult[] = [];
  if (ev.segregation) results.push(evalSegregation(ev.segregation));
  if (ev.buffer) results.push(evalBuffer(ev.buffer));
  if (ev.operator) results.push(evalOperator(ev.operator));
  if (ev.counterparty) results.push(evalCounterparty(ev.counterparty, action.timestampIso));
  if (results.length === 0) throw new SdkError('no BCB predicates in evidence', 'INVALID_INPUT');
  const verdict = aggregate(results);
  return {
    verdict, predicateSet: BCB_PREDICATE_SET, predicateVersion: PREDICATE_VERSION, results,
    evidenceHashHex: evidenceHash(action, BCB_PREDICATE_SET, verdict),
  };
}

/** Evaluate the CVM RCVM 88 Category-A numeric predicates present in the evidence. */
export function evaluateCvmRcvm88(action: PolicyAction, ev: CvmRcvm88Evidence): PolicyEvaluation {
  const results: PredicateResult[] = [];
  if (ev.retail) results.push(evalRetail(ev.retail));
  if (ev.issuer) {
    results.push(evalIssuerCap(ev.issuer));
    results.push(evalCaptureWindow(ev.issuer));
    results.push(evalCooldown(ev.issuer, action.timestampIso));
  }
  if (results.length === 0) throw new SdkError('no CVM predicates in evidence', 'INVALID_INPUT');
  const verdict = aggregate(results);
  return {
    verdict, predicateSet: CVM_PREDICATE_SET, predicateVersion: PREDICATE_VERSION, results,
    evidenceHashHex: evidenceHash(action, CVM_PREDICATE_SET, verdict),
  };
}
