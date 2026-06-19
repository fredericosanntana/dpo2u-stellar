#![no_std]
#![allow(deprecated)] // events.publish() works fine; #[contractevent] migration is v0.2
//! DPO2U Anti-corruption Pilot — Attestation Registry
//!
//! Minimal, immutable Soroban contract that persists compliance attestations
//! emitted by an off-chain MCP predicate engine. No PII on-chain.
//!
//! Reference: DPO2U_PRD_Piloto_Anticorrupcao_v0.2 (see `docs/`).

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    BytesN, Env, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    UseCaseInactive = 2,
    AttestationExists = 3,
    AttestationNotFound = 4,
    AdminOnly = 5,
    AlreadyInitialized = 6,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    UseCaseConfig(Symbol),
    Authorized(Address),
    Attestation(Symbol, BytesN<32>),
    Escrow(Symbol, Address), // use_case_id, target_company
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Verdict {
    Pass,
    Fail,
    Review,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UseCaseConfig {
    pub active: bool,
    pub predicate_set: Symbol,
    pub predicate_version: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttestationRecord {
    pub verdict: Verdict,
    pub predicate_set: Symbol,
    pub predicate_version: u32,
    pub submitted_by: Address,
    pub timestamp: u64,
    pub metadata_hash: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub funder: Address,
    pub target_company: Address,
    pub token: Address,
    pub amount: i128,
}

#[contract]
pub struct AntiCorruptionAttestation;

#[contractimpl]
impl AntiCorruptionAttestation {
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn configure_use_case(
        env: Env,
        admin: Address,
        use_case_id: Symbol,
        config: UseCaseConfig,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::UseCaseConfig(use_case_id.clone()), &config);
        env.events()
            .publish((symbol_short!("config"), use_case_id), config);
    }

    pub fn authorize_submitter(env: Env, admin: Address, submitter: Address, allowed: bool) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Authorized(submitter.clone()), &allowed);
        env.events()
            .publish((symbol_short!("auth"), submitter), allowed);
    }

    pub fn register_attestation(
        env: Env,
        submitter: Address,
        use_case_id: Symbol,
        verdict: Verdict,
        evidence_hash: BytesN<32>,
        metadata_hash: BytesN<32>,
    ) -> u32 {
        submitter.require_auth();

        let authorized: bool = env
            .storage()
            .instance()
            .get(&DataKey::Authorized(submitter.clone()))
            .unwrap_or(false);
        if !authorized {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        let config: UseCaseConfig = match env
            .storage()
            .instance()
            .get(&DataKey::UseCaseConfig(use_case_id.clone()))
        {
            Some(c) => c,
            None => panic_with_error!(&env, Error::UseCaseInactive),
        };
        if !config.active {
            panic_with_error!(&env, Error::UseCaseInactive);
        }

        let key = DataKey::Attestation(use_case_id.clone(), evidence_hash.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::AttestationExists);
        }

        let record = AttestationRecord {
            verdict,
            predicate_set: config.predicate_set,
            predicate_version: config.predicate_version,
            submitted_by: submitter,
            timestamp: env.ledger().timestamp(),
            metadata_hash,
        };

        env.storage().persistent().set(&key, &record);

        env.events().publish(
            (symbol_short!("attest"), use_case_id, evidence_hash),
            record,
        );

        env.ledger().sequence()
    }

    pub fn verify_attestation(
        env: Env,
        use_case_id: Symbol,
        evidence_hash: BytesN<32>,
    ) -> Option<AttestationRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Attestation(use_case_id, evidence_hash))
    }

    /// Deposita fundos no contrato atrelados à conformidade futura de uma empresa alvo.
    pub fn deposit_funds(
        env: Env,
        funder: Address,
        target_company: Address,
        token: Address,
        amount: i128,
        use_case_id: Symbol,
    ) {
        funder.require_auth();

        if amount <= 0 {
            panic!("Amount must be greater than zero");
        }

        let escrow_key = DataKey::Escrow(use_case_id.clone(), target_company.clone());
        if env.storage().persistent().has(&escrow_key) {
            panic!("Escrow already exists for this use case and target company");
        }

        // Transfere o dinheiro do funder para este Smart Contract
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&funder, &env.current_contract_address(), &amount);

        let escrow = Escrow {
            funder,
            target_company,
            token,
            amount,
        };

        env.storage().persistent().set(&escrow_key, &escrow);
        env.events()
            .publish((symbol_short!("deposit"), use_case_id), escrow);
    }

    /// Registra a atestação e, baseado no veredito, destrava os fundos do Escrow.
    pub fn attest_and_execute(
        env: Env,
        submitter: Address,
        use_case_id: Symbol,
        target_company: Address,
        verdict: Verdict,
        evidence_hash: BytesN<32>,
        metadata_hash: BytesN<32>,
    ) -> u32 {
        // Primeiro, faz todo o registro normal da atestação
        let seq = Self::register_attestation(
            env.clone(),
            submitter,
            use_case_id.clone(),
            verdict.clone(),
            evidence_hash,
            metadata_hash,
        );

        // Agora executa a lógica financeira de Custódia (Escrow)
        let escrow_key = DataKey::Escrow(use_case_id.clone(), target_company.clone());
        if let Some(escrow) = env.storage().persistent().get::<_, Escrow>(&escrow_key) {
            let client = soroban_sdk::token::Client::new(&env, &escrow.token);

            match verdict {
                Verdict::Pass => {
                    // Compliance comprovado: O dinheiro é liberado para o fornecedor
                    client.transfer(
                        &env.current_contract_address(),
                        &escrow.target_company,
                        &escrow.amount,
                    );
                    env.storage().persistent().remove(&escrow_key);
                    env.events().publish(
                        (symbol_short!("executed"), use_case_id),
                        escrow.target_company,
                    );
                }
                Verdict::Fail => {
                    // Quebra de compliance: O dinheiro é devolvido para a contratante/fundo
                    client.transfer(
                        &env.current_contract_address(),
                        &escrow.funder,
                        &escrow.amount,
                    );
                    env.storage().persistent().remove(&escrow_key);
                    env.events()
                        .publish((symbol_short!("refunded"), use_case_id), escrow.funder);
                }
                Verdict::Review => {
                    // Fundos continuam travados aguardando auditoria manual
                }
            }
        }

        seq
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized")
    }

    fn assert_admin(env: &Env, claimed_admin: &Address) {
        let admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(a) => a,
            None => panic_with_error!(env, Error::AdminOnly),
        };
        if claimed_admin != &admin {
            panic_with_error!(env, Error::AdminOnly);
        }
    }
}

#[cfg(test)]
mod test;
