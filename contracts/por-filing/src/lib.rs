#![no_std]
#![allow(deprecated)] // events.publish() works; #[contractevent] migration is v0.2
//! DPO2U — `por_filing_v1` (selo das remessas BCB 5710/5711)
//!
//! Contrato Soroban mínimo e imutável que sela o COMMITMENT de cada remessa
//! regulatória (5710 prova de reservas mensal / 5711 custódia diária): só o
//! `sha256(XML)` + metadados públicos (código de PSAV, data-base, tipo, revisão).
//!
//! **Zero PII on-chain.** CPF, endereços de clientes, saldos e o XML ficam no
//! engine off-chain; a Stellar é o cartório que prova *o que foi filado, quando
//! e em que versão* — verificável por qualquer um via `/verify/:id`.
//!
//! Modelo: `anticorruption-attestation/src/lib.rs` (`CC4TJGDR…`).
//!
//! Escopo v1 = **Cunha 1-A** (`seal_filing`, sem ZK). `seal_solvency` (Cunha 1-B,
//! declaração pública de solvência via cross-call ao `zk-verifier`) entra após a
//! cerimônia de trusted-setup da vk de PoR — NÃO está neste v1 para não shippar
//! verificação que não existe. O tipo `SolvencyClaim` + `get_solvency` já nascem
//! no schema para forward-compat (reader devolve `None` até a 1-B).

use por_verifier::{PorVerifierClient, Proof as ZkProof, VerificationKey as ZkVk};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    panic_with_error, symbol_short, Address, BytesN, Env, Symbol, Vec, U256,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    PsavInactive = 2,
    AdminOnly = 5,
    AlreadyInitialized = 6,
    VerifierNotSet = 7, // seal_solvency antes de set_verifier (fail-closed)
    ZkVerifyFailed = 8, // prova ZK não verificou on-chain
    NotSolvent = 9,     // sinal público solvent != 1
    BadSignals = 10,    // contagem de sinais públicos != 3 ([solvent, commit, context])
}

/// 5710 = prova de reservas (mensal) · 5711 = custódia (diária).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DocType {
    Por5710,
    Custody5711,
}

/// Espelha o leiaute BCB: I = inclusão · S = substituição.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TipoRemessa {
    Inclusao,
    Substituicao,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    PsavConfig(Symbol),           // psav_code (Z+7) -> ativo/inativo
    Authorized(Address),          // submitter autorizado (gateway-signer / signer da PSAV)
    Filing(Symbol, DocType, u32), // (psav_code, doc_type, data_base AAAAMMDD) -> FilingSeal (current)
    Solvency(Symbol, u32),        // (psav_code, data_base) -> SolvencyClaim (Cunha 1-B)
    VerifierAddr,                 // Address do por-verifier (BN254) — admin-set
    VerifierVk, // VerificationKey PoR PINADA (fail-closed; submitter nunca fornece)
}

/// Selo de uma remessa. NENHUM campo pode carregar PII (só hash/código/data/enum).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FilingSeal {
    pub doc_type: DocType,
    pub data_base: u32, // AAAAMMDD (Symbol não aceita hífen → u32)
    pub tipo_remessa: TipoRemessa,
    pub filing_hash: BytesN<32>, // SHA-256 do XML canônico da remessa
    pub revision: u32,           // 0 na 1ª inclusão; +1 a cada substituição (hash novo)
    pub submitted_by: Address,
    pub timestamp: u64,
    pub seq: u32, // ledger sequence
}

/// Declaração pública de solvência (Cunha 1-B — só agregados, sem PII).
/// Escrita por `seal_solvency` (futuro), após a cerimônia de vk de PoR.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SolvencyClaim {
    pub data_base: u32,
    pub solvent: bool,             // reservas >= obrigações
    pub ratio_bps: u32,            // reserva/obrigação em bps (cap 65535) — agregado, não sensível
    pub zk_verified: bool,         // true só se o zk-verifier retornou true
    pub proof_context: BytesN<32>, // binding anti-replay (H(psav,"BCB-PoR",data_base,nonce))
    pub submitted_by: Address,
    pub timestamp: u64,
}

/// Verifying key Groth16/BN254 da PoR. Definida AQUI (não importada do crate
/// por-verifier) para entrar no spec do por-filing — assim CLI/SDK conseguem
/// construir o arg de `set_verifier`. Campos = `por_verifier::VerificationKey`.
#[contracttype]
#[derive(Clone)]
pub struct PorVk {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

/// Prova Groth16/BN254 da PoR (idem PorVk — local p/ entrar no spec).
#[contracttype]
#[derive(Clone)]
pub struct PorProof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contract]
pub struct PorFiling;

#[contractimpl]
impl PorFiling {
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Habilita/desabilita uma PSAV (psav_code = `psavCustodiante` do leiaute, público).
    pub fn register_psav(env: Env, admin: Address, psav_code: Symbol, active: bool) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PsavConfig(psav_code.clone()), &active);
        env.events()
            .publish((symbol_short!("psav"), psav_code), active);
    }

    /// Autoriza o signer que sela (gateway-signer DPO2U / signer da PSAV).
    pub fn authorize_submitter(env: Env, admin: Address, submitter: Address, allowed: bool) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Authorized(submitter.clone()), &allowed);
        env.events()
            .publish((symbol_short!("auth"), submitter), allowed);
    }

    /// Sela o commitment de uma remessa. Em `Substituicao` (hash novo) incrementa
    /// `revision` preservando a trilha via event log. Reenvio idêntico (mesmo hash)
    /// é no-op idempotente (retorna o `seq` existente, sem novo evento).
    pub fn seal_filing(
        env: Env,
        submitter: Address,
        psav_code: Symbol,
        doc_type: DocType,
        data_base: u32,
        tipo_remessa: TipoRemessa,
        filing_hash: BytesN<32>,
    ) -> u32 {
        submitter.require_auth();
        Self::assert_authorized(&env, &submitter);
        Self::assert_psav_active(&env, &psav_code);

        let key = DataKey::Filing(psav_code.clone(), doc_type.clone(), data_base);
        let prev = env.storage().persistent().get::<_, FilingSeal>(&key);
        let revision = match &prev {
            // Idempotência: reenvio idêntico (mesmo hash) → no-op, devolve o seq atual.
            Some(p) if p.filing_hash == filing_hash => return p.seq,
            // Substituição: hash novo sobre a mesma (psav, doc, data_base) → revisão++.
            Some(p) => p.revision + 1,
            None => 0,
        };

        let seal = FilingSeal {
            doc_type,
            data_base,
            tipo_remessa,
            filing_hash: filing_hash.clone(),
            revision,
            submitted_by: submitter,
            timestamp: env.ledger().timestamp(),
            seq: env.ledger().sequence(),
        };
        env.storage().persistent().set(&key, &seal);
        env.events().publish(
            (symbol_short!("filing"), psav_code, filing_hash),
            seal.clone(),
        );
        seal.seq
    }

    pub fn get_filing(
        env: Env,
        psav_code: Symbol,
        doc_type: DocType,
        data_base: u32,
    ) -> Option<FilingSeal> {
        env.storage()
            .persistent()
            .get(&DataKey::Filing(psav_code, doc_type, data_base))
    }

    /// Reader da declaração de solvência (Cunha 1-B). v1 devolve `None` (sem writer
    /// até `seal_solvency` ser ativado pós-cerimônia da vk de PoR).
    pub fn get_solvency(env: Env, psav_code: Symbol, data_base: u32) -> Option<SolvencyClaim> {
        env.storage()
            .persistent()
            .get(&DataKey::Solvency(psav_code, data_base))
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Configura o por-verifier (BN254) + FIXA a vk canônica de PoR. Só admin.
    /// A vk fica pinada aqui — o submitter de `seal_solvency` nunca fornece vk
    /// (fecha o achado T1: vk controlada pelo cliente). Fail-closed: `seal_solvency`
    /// aborta enquanto isto não for setado.
    pub fn set_verifier(env: Env, admin: Address, verifier: Address, vk: PorVk) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::VerifierAddr, &verifier);
        env.storage().instance().set(&DataKey::VerifierVk, &vk);
        env.events().publish((symbol_short!("verifier"),), verifier);
    }

    /// Cunha 1-B — sela a declaração pública de solvência APÓS verificar a prova ZK
    /// on-chain (cross-call ao por-verifier com a vk PINADA). Reservas/obrigações
    /// NUNCA aparecem on-chain: só a prova + sinais públicos `[solvent, commit, context]`.
    /// `ratio_bps` é agregado disclosed (reserva/obrigação em bps, não sensível).
    /// Idempotente por (psav, data_base): reenvio sobrescreve com nova prova/contexto.
    pub fn seal_solvency(
        env: Env,
        submitter: Address,
        psav_code: Symbol,
        data_base: u32,
        proof: PorProof,
        pub_signals: Vec<Bn254Fr>,
        ratio_bps: u32,
    ) -> u32 {
        submitter.require_auth();
        Self::assert_authorized(&env, &submitter);
        Self::assert_psav_active(&env, &psav_code);

        // Sinais esperados na ordem do circuito: [solvent, commit, context].
        if pub_signals.len() != 3 {
            panic_with_error!(&env, Error::BadSignals);
        }
        // solvent público deve ser 1 (o circuito força `Σ reservas ≥ Σ obrigações`).
        if pub_signals.get(0).unwrap().to_u256() != U256::from_u32(&env, 1) {
            panic_with_error!(&env, Error::NotSolvent);
        }

        // verifier + vk PINADOS (admin-set). Fail-closed se ausentes.
        let verifier: Address = match env.storage().instance().get(&DataKey::VerifierAddr) {
            Some(a) => a,
            None => panic_with_error!(&env, Error::VerifierNotSet),
        };
        let vk: PorVk = match env.storage().instance().get(&DataKey::VerifierVk) {
            Some(v) => v,
            None => panic_with_error!(&env, Error::VerifierNotSet),
        };

        // Converte os tipos locais (spec do por-filing) → tipos do por-verifier p/ o cross-call.
        let zk_vk = ZkVk {
            alpha: vk.alpha,
            beta: vk.beta,
            gamma: vk.gamma,
            delta: vk.delta,
            ic: vk.ic,
        };
        let zk_proof = ZkProof {
            a: proof.a,
            b: proof.b,
            c: proof.c,
        };

        // Cross-call: verifica a prova Groth16/BN254 on-chain. Fail-closed.
        let ok =
            PorVerifierClient::new(&env, &verifier).verify_proof(&zk_vk, &zk_proof, &pub_signals);
        if !ok {
            panic_with_error!(&env, Error::ZkVerifyFailed);
        }

        // proof_context = sinal público `context` (binding anti-replay), 32 bytes.
        let proof_context: BytesN<32> = pub_signals.get(2).unwrap().to_bytes();

        let claim = SolvencyClaim {
            data_base,
            solvent: true,
            ratio_bps,
            zk_verified: true,
            proof_context,
            submitted_by: submitter,
            timestamp: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Solvency(psav_code.clone(), data_base), &claim);
        env.events().publish(
            (symbol_short!("solvency"), psav_code, data_base),
            claim.clone(),
        );
        env.ledger().sequence()
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    fn assert_admin(env: &Env, who: &Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != *who {
            panic_with_error!(env, Error::AdminOnly);
        }
    }

    fn assert_authorized(env: &Env, submitter: &Address) {
        let ok: bool = env
            .storage()
            .instance()
            .get(&DataKey::Authorized(submitter.clone()))
            .unwrap_or(false);
        if !ok {
            panic_with_error!(env, Error::NotAuthorized);
        }
    }

    fn assert_psav_active(env: &Env, psav_code: &Symbol) {
        let active: bool = env
            .storage()
            .instance()
            .get(&DataKey::PsavConfig(psav_code.clone()))
            .unwrap_or(false);
        if !active {
            panic_with_error!(env, Error::PsavInactive);
        }
    }
}

mod test;
