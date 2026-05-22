// Registro dos use cases configurados no contrato de atestação DPO2U.
//
// O contrato Soroban é genérico: qualquer `use_case_id` é válido. Esta lista é
// uma conveniência para o consumidor do SDK saber o que está ativo on-chain e
// a qual camada pertence — B2G (anticorrupção) ou B2B (compliance).
//
// Mantida em sincronia com as chamadas `configure_use_case` da testnet.

export type UseCaseLayer = 'B2G' | 'B2B';

export interface UseCaseInfo {
  readonly id: string;
  readonly layer: UseCaseLayer;
  readonly label: string;
  readonly description: string;
}

/** Use cases ativos no contrato de atestação (testnet). */
export const USE_CASES: readonly UseCaseInfo[] = [
  // ── B2G — piloto anticorrupção (compras públicas) ──────────────────────────
  { id: 'sanction_check_v1', layer: 'B2G', label: 'Fornecedor sancionado', description: 'Fornecedor com sanção CEIS/CNEP/CEPIM vigente em contratação pública.' },
  { id: 'overpricing_v1', layer: 'B2G', label: 'Sobrepreço', description: 'Preço unitário outlier (Z-modificado) contra a cesta de mercado.' },
  { id: 'divergent_payee_v1', layer: 'B2G', label: 'Favorecido divergente', description: 'Favorecido de ordem bancária diverge do fornecedor contratado.' },
  { id: 'leniency_flag_v1', layer: 'B2G', label: 'Acordo de leniência', description: 'Fornecedor sob acordo de leniência (Lei 12.846) ainda contratando.' },
  { id: 'winner_rotation_v1', layer: 'B2G', label: 'Rodízio de vencedores', description: 'Rodízio de vencedores entre um grupo recorrente de licitantes.' },
  { id: 'bank_chg', layer: 'B2G', label: 'Troca de conta bancária', description: 'Pedido de troca de conta de fornecedor — verificação anti-fraude.' },
  // ── B2B — compliance de organizações ───────────────────────────────────────
  { id: 'lgpd_compliance_v1', layer: 'B2B', label: 'Conformidade LGPD', description: 'Maturidade do programa de privacidade contra a Lei 13.709/2018.' },
  { id: 'gdpr_compliance_v1', layer: 'B2B', label: 'Conformidade GDPR', description: 'Maturidade do programa de proteção de dados contra o GDPR.' },
  { id: 'consent_record_v1', layer: 'B2B', label: 'Registro de consentimento', description: 'Selo de um evento de consentimento (DPDP Índia / LGPD).' },
  { id: 'ccpa_optout_v1', layer: 'B2B', label: 'Opt-out CCPA', description: 'Selo de um opt-out de consumidor (CCPA/CPRA, Califórnia).' },
  { id: 'popia_officer_v1', layer: 'B2B', label: 'Information Officer POPIA', description: 'Selo da nomeação do Information Officer (POPIA, África do Sul).' },
  { id: 'pipeda_consent_v1', layer: 'B2B', label: 'Consentimento PIPEDA', description: 'Selo de um registro de consentimento PIPEDA (Canadá).' },
  { id: 'pipa_identity_v1', layer: 'B2B', label: 'Identidade PIPA', description: 'Selo de identidade alternativa ao RRN (PIPA, Coreia do Sul).' },
];

/** Use cases de uma camada. */
export function useCasesByLayer(layer: UseCaseLayer): readonly UseCaseInfo[] {
  return USE_CASES.filter((u) => u.layer === layer);
}

/** Metadados de um use case por id (ou `undefined` se não catalogado). */
export function findUseCase(id: string): UseCaseInfo | undefined {
  return USE_CASES.find((u) => u.id === id);
}
