import { describe, it, expect } from 'vitest';
import {
  USE_CASES,
  DATA_PROTECTION_JURISDICTIONS,
  AI_GOVERNANCE_FRAMEWORKS,
  SECTORAL_FRAMEWORKS,
  useCasesByLayer,
  findUseCase,
  deployableUseCases,
} from '../use-cases.js';

const SYMBOL_RE = /^[a-zA-Z0-9_]{1,32}$/;

describe('catálogo de use cases (estado da arte, 66)', () => {
  it('tem exatamente 66 use cases', () => {
    expect(USE_CASES.length).toBe(66);
  });

  it('todos os ids são únicos', () => {
    const ids = USE_CASES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todos os ids são Symbols Soroban válidos (≤32 chars, [a-zA-Z0-9_])', () => {
    for (const u of USE_CASES) {
      expect(SYMBOL_RE.test(u.id), `id inválido: ${u.id}`).toBe(true);
    }
  });

  it('cobre as 23 jurisdições de proteção de dados (compliance_<code>_v1)', () => {
    expect(DATA_PROTECTION_JURISDICTIONS.length).toBe(23);
    for (const code of DATA_PROTECTION_JURISDICTIONS) {
      expect(findUseCase(`${code}_compliance_v1`), `falta ${code}`).toBeDefined();
    }
  });

  it('cobre os 8 frameworks de AI governance (ai_<fw>_v1)', () => {
    expect(AI_GOVERNANCE_FRAMEWORKS.length).toBe(8);
    for (const fw of AI_GOVERNANCE_FRAMEWORKS) {
      const uc = findUseCase(`ai_${fw}_v1`);
      expect(uc, `falta ai_${fw}_v1`).toBeDefined();
      expect(uc?.layer).toBe('AIGOV');
    }
  });

  it('cobre os 10 frameworks setoriais (sect_<code>_v1)', () => {
    expect(SECTORAL_FRAMEWORKS.length).toBe(10);
    for (const code of SECTORAL_FRAMEWORKS) {
      const uc = findUseCase(`sect_${code}_v1`);
      expect(uc, `falta sect_${code}_v1`).toBeDefined();
      expect(uc?.layer).toBe('CRYPTO');
    }
  });

  it('contagem por camada', () => {
    expect(useCasesByLayer('B2G').length).toBe(6);
    expect(useCasesByLayer('AIGOV').length).toBe(12);
    expect(useCasesByLayer('CRYPTO').length).toBe(14);
    expect(useCasesByLayer('B2B').length).toBe(32);
    expect(useCasesByLayer('VALUE').length).toBe(2);
  });

  it('camada VALUE = Trilha de Conformidade de Valor (VASP + Agente)', () => {
    expect(findUseCase('vasp_por_br_v1')?.layer).toBe('VALUE');
    expect(findUseCase('agent_runtime_v1')?.layer).toBe('VALUE');
  });

  it('deployableUseCases exclui o ZK (ativado pós-cerimônia)', () => {
    const dep = deployableUseCases();
    expect(dep.length).toBe(65);
    expect(dep.find((u) => u.id === 'zk_compliance_v1')).toBeUndefined();
  });

  it('use cases de proteção de dados/AI/setorial têm mcpTool documentado', () => {
    const withTool = USE_CASES.filter((u) => u.mcpTool);
    // 22 compliance + 8 AI fw + 10 sectoral + eventos + cripto + zk
    expect(withTool.length).toBeGreaterThanOrEqual(54);
  });
});
