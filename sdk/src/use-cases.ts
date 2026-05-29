// Catálogo "estado da arte" dos use cases configurados no contrato de atestação DPO2U.
//
// O contrato Soroban é genérico: qualquer `use_case_id` (Symbol ≤32 chars) é válido.
// Esta lista é o catálogo CANÔNICO — explícito por item (1 id por jurisdição/framework),
// espelhando dpo2u-mcp (24 jurisdições + 8 frameworks AI + 10 setoriais + MiCAR/CASP/CVM)
// e dpo2u-solana (16 programas). Ver docs/2026-05-29-state-of-the-art-catalog.md.
//
// `mcpTool` documenta qual ferramenta MCP computa o verdict do gateway para o use case.

export type UseCaseLayer = 'B2G' | 'B2B' | 'AIGOV' | 'CRYPTO';

export interface UseCaseInfo {
  readonly id: string;
  readonly layer: UseCaseLayer;
  readonly label: string;
  readonly description: string;
  /** Código de jurisdição de proteção de dados (quando aplicável). */
  readonly jurisdiction?: string;
  /** Framework AI/setorial (quando aplicável). */
  readonly framework?: string;
  /** Ferramenta MCP que computa o verdict no gateway. */
  readonly mcpTool?: string;
}

/** 22 jurisdições de proteção de dados (canônico; MiCAR/CASP são cripto, ver abaixo). */
export const DATA_PROTECTION_JURISDICTIONS: readonly string[] = [
  'lgpd', 'gdpr', 'ccpa', 'pipeda', 'law25', 'appi', 'pipa', 'pdp', 'pdpa', 'dpdp', 'uae',
  'popia', 'ndpa', 'mexico', 'vietnam', 'malaysia', 'kenya', 'ghana', 'colombia', 'tanzania',
  'rwanda', 'uganda',
];

/** 8 frameworks de AI governance. */
export const AI_GOVERNANCE_FRAMEWORKS: readonly string[] = [
  'japan', 'hiroshima', 'eu_aia', 'korea', 'caidp', 'unesco', 'mgf_agentic', 'gov_stack',
];

/** 10 frameworks setoriais (cripto/financeiro). */
export const SECTORAL_FRAMEWORKS: readonly string[] = [
  'bcb_14478', 'eudr', 'mifid2', 'pci_dss', 'cvm_175', 'rfb_1888', 'eidas2', 'fatf_tr',
  'sec_howey', 'cnbv_uif',
];

const JURISDICTION_NAMES: Record<string, string> = {
  lgpd: 'Brasil — Lei 13.709/2018 (LGPD)', gdpr: 'União Europeia — GDPR 2016/679',
  ccpa: 'Califórnia — CCPA/CPRA', pipeda: 'Canadá — PIPEDA', law25: 'Quebec — Lei 25',
  appi: 'Japão — APPI (Act 57/2003)', pipa: 'Coreia do Sul — PIPA', pdp: 'Indonésia — UU PDP 27/2022',
  pdpa: 'Singapura — PDPA 2012', dpdp: 'Índia — DPDP Act 2023', uae: 'EAU — PDPL (Decreto 45/2021)',
  popia: 'África do Sul — POPIA', ndpa: 'Nigéria — NDPA 2023', mexico: 'México — LFPDPPP',
  vietnam: 'Vietnã — Decreto 13/2023 + Lei 91/2025', malaysia: 'Malásia — PDPA 2010+2024',
  kenya: 'Quênia — Data Protection Act 2019', ghana: 'Gana — Data Protection Act 2012',
  colombia: 'Colômbia — Ley 1581/2012', tanzania: 'Tanzânia — PDPA 2022',
  rwanda: 'Ruanda — Law 058/2021', uganda: 'Uganda — DPPA 2019',
};

const AI_FRAMEWORK_NAMES: Record<string, string> = {
  japan: 'Japão — AI Promotion Act 2025', hiroshima: 'G7 — Hiroshima ICOC',
  eu_aia: 'União Europeia — AI Act 2024/1689', korea: 'Coreia — AI Basic Act',
  caidp: 'CAIDP — Universal Guidelines', unesco: 'UNESCO — Recomendação Ética IA (RAM)',
  mgf_agentic: 'Singapura IMDA — MGF-Agentic', gov_stack: 'AI Governance Stack (L1-L5/A1-A5)',
};

const SECTORAL_NAMES: Record<string, string> = {
  bcb_14478: 'Brasil — BCB Lei 14.478 (VASP)', eudr: 'UE — Deforestation Regulation',
  mifid2: 'UE — MiFID II', pci_dss: 'Global — PCI-DSS v4', cvm_175: 'Brasil — CVM Res. 175/88',
  rfb_1888: 'Brasil — RFB IN 1888 (cripto)', eidas2: 'UE — eIDAS 2.0',
  fatf_tr: 'Global — FATF Travel Rule (R.16)', sec_howey: 'EUA — SEC Howey + Reg D',
  cnbv_uif: 'México — CNBV/UIF Fintech/AML',
};

// ── B2G — piloto anticorrupção (compras públicas) — 6 ────────────────────────
const B2G: readonly UseCaseInfo[] = [
  { id: 'sanction_check_v1', layer: 'B2G', label: 'Fornecedor sancionado', description: 'Fornecedor com sanção CEIS/CNEP/CEPIM vigente em contratação pública.' },
  { id: 'overpricing_v1', layer: 'B2G', label: 'Sobrepreço', description: 'Preço unitário outlier (Z-modificado) contra a cesta de mercado.' },
  { id: 'divergent_payee_v1', layer: 'B2G', label: 'Favorecido divergente', description: 'Favorecido de ordem bancária diverge do fornecedor contratado.' },
  { id: 'leniency_flag_v1', layer: 'B2G', label: 'Acordo de leniência', description: 'Fornecedor sob acordo de leniência (Lei 12.846) ainda contratando.' },
  { id: 'winner_rotation_v1', layer: 'B2G', label: 'Rodízio de vencedores', description: 'Rodízio de vencedores entre um grupo recorrente de licitantes.' },
  { id: 'bank_chg', layer: 'B2G', label: 'Troca de conta bancária', description: 'Pedido de troca de conta de fornecedor — verificação anti-fraude.' },
];

// ── B2B — eventos / direitos do titular — 8 ──────────────────────────────────
const EVENTS: readonly UseCaseInfo[] = [
  { id: 'consent_record_v1', layer: 'B2B', label: 'Registro de consentimento', description: 'Selo de evento de consentimento (DPDP Índia / LGPD).', mcpTool: 'submit_consent_record' },
  { id: 'consent_revoke_v1', layer: 'B2B', label: 'Revogação de consentimento', description: 'Selo de revogação de consentimento (DPDP §6(4) / LGPD Art.8 §5).', mcpTool: 'submit_consent_revoke' },
  { id: 'ccpa_optout_v1', layer: 'B2B', label: 'Opt-out CCPA', description: 'Selo de opt-out de consumidor (CCPA/CPRA §1798.135).', jurisdiction: 'ccpa', mcpTool: 'register_ccpa_optout' },
  { id: 'popia_officer_v1', layer: 'B2B', label: 'Information Officer POPIA', description: 'Selo da nomeação do Information Officer (POPIA §55).', jurisdiction: 'popia', mcpTool: 'register_popia_io' },
  { id: 'pipeda_consent_v1', layer: 'B2B', label: 'Consentimento PIPEDA', description: 'Registro de consentimento PIPEDA Schedule 1 (Canadá).', jurisdiction: 'pipeda', mcpTool: 'record_pipeda_consent' },
  { id: 'pipa_identity_v1', layer: 'B2B', label: 'Identidade PIPA', description: 'Identidade alternativa ao RRN (PIPA Art.24, Coreia).', jurisdiction: 'pipa', mcpTool: 'issue_pipa_zk_identity' },
  { id: 'erasure_v1', layer: 'B2B', label: 'Apagamento (Art.18/Art.17)', description: 'Selo de execução de apagamento (LGPD Art.18 / GDPR Art.17).', mcpTool: 'erase_attestation_payload' },
  { id: 'dsr_request_v1', layer: 'B2B', label: 'Direitos do titular (DSR)', description: 'Selo de atendimento a requisição de direitos do titular.', mcpTool: 'create_dpo_report' },
];

// ── AI Governance — atestações transversais — 4 ──────────────────────────────
const AI_CROSS: readonly UseCaseInfo[] = [
  { id: 'ai_red_line_v1', layer: 'AIGOV', label: 'Red-lines (negativo)', description: 'Atesta NÃO uso de categorias proibidas (CAIDP 7 red-lines / EU-AIA Art.5).', mcpTool: 'audit_ai_red_lines' },
  { id: 'ai_hria_v1', layer: 'AIGOV', label: 'HRIA (direitos humanos)', description: 'Human Rights Impact Assessment de sistema de IA (CAIDP/UNESCO).', mcpTool: 'generate_ai_hria' },
  { id: 'ai_incident_v1', layer: 'AIGOV', label: 'Incidente de IA', description: 'Relato de incidente de IA (alinhado AIAAIC).', mcpTool: 'report_ai_incident' },
  { id: 'caio_appoint_v1', layer: 'AIGOV', label: 'Nomeação CAIO', description: 'Atesta nomeação do Chief AI Officer (DS-920).', mcpTool: 'generate_caio_governance_plan' },
];

// ── Cripto / financeiro — núcleo — 3 ─────────────────────────────────────────
const CRYPTO_CORE: readonly UseCaseInfo[] = [
  { id: 'micar_art_v1', layer: 'CRYPTO', label: 'MiCAR ART (Tít. III)', description: 'Proof of reserve + safeguards de Asset-Referenced Token (MiCAR Art.23/35/36/39).', framework: 'micar', mcpTool: 'audit_micar_art' },
  { id: 'micar_casp_v1', layer: 'CRYPTO', label: 'MiCA CASP (Tít. V)', description: 'Conformidade de Crypto-Asset Service Provider (MiCA Art.68-92).', framework: 'micar_casp', mcpTool: 'check_sectoral_framework' },
  { id: 'cvm_token_v1', layer: 'CRYPTO', label: 'CVM token (Brasil)', description: 'Regras de token de investimento CVM (Res. 175/88).', framework: 'cvm', mcpTool: 'validate_cvm_token_rules' },
];

// ── ZK — score privado, prova pública — 1 (ativado pós-cerimônia) ─────────────
const ZK: readonly UseCaseInfo[] = [
  { id: 'zk_compliance_v1', layer: 'B2B', label: 'Atestação de conformidade ZK', description: 'Score privado, prova pública (Groth16/BLS12-381). Ativado só após a cerimônia de trusted setup.', mcpTool: 'zk_compliance_attest' },
];

// ── Gerados: maturidade por jurisdição (22), AI frameworks (8), setoriais (10) ─
const DP_COMPLIANCE: readonly UseCaseInfo[] = DATA_PROTECTION_JURISDICTIONS.map((code) => ({
  id: `${code}_compliance_v1`,
  layer: 'B2B' as const,
  label: `Conformidade ${code.toUpperCase()}`,
  description: `Maturidade do programa de proteção de dados — ${JURISDICTION_NAMES[code] ?? code}.`,
  jurisdiction: code,
  mcpTool: 'check_compliance',
}));

const AI_FRAMEWORKS: readonly UseCaseInfo[] = AI_GOVERNANCE_FRAMEWORKS.map((fw) => ({
  id: `ai_${fw}_v1`,
  layer: 'AIGOV' as const,
  label: `AI governance — ${fw}`,
  description: `Conformidade de IA contra ${AI_FRAMEWORK_NAMES[fw] ?? fw}.`,
  framework: fw,
  mcpTool: 'audit_ai_governance',
}));

const SECTORAL: readonly UseCaseInfo[] = SECTORAL_FRAMEWORKS.map((code) => ({
  id: `sect_${code}_v1`,
  layer: 'CRYPTO' as const,
  label: `Setorial — ${code}`,
  description: `Conformidade setorial — ${SECTORAL_NAMES[code] ?? code}.`,
  framework: code,
  mcpTool: 'check_sectoral_framework',
}));

/** Catálogo canônico — 62 use cases (61 ativados no deploy; zk_compliance_v1 pós-cerimônia). */
export const USE_CASES: readonly UseCaseInfo[] = [
  ...B2G,
  ...DP_COMPLIANCE,
  ...EVENTS,
  ...AI_FRAMEWORKS,
  ...AI_CROSS,
  ...CRYPTO_CORE,
  ...SECTORAL,
  ...ZK,
];

/** Use cases de uma camada. */
export function useCasesByLayer(layer: UseCaseLayer): readonly UseCaseInfo[] {
  return USE_CASES.filter((u) => u.layer === layer);
}

/** Metadados de um use case por id (ou `undefined` se não catalogado). */
export function findUseCase(id: string): UseCaseInfo | undefined {
  return USE_CASES.find((u) => u.id === id);
}

/** Use cases ativados no deploy (todos menos os ZK, que dependem da cerimônia). */
export function deployableUseCases(): readonly UseCaseInfo[] {
  return USE_CASES.filter((u) => u.id !== 'zk_compliance_v1');
}
