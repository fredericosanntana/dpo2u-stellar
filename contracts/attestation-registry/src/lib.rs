#![no_std]
#![allow(deprecated)] // events.publish() works fine; #[contractevent] migration is v0.2
//! DPO2U Attestation Registry — v2
//!
//! Successor to `anticorruption-attestation`. That contract is deployed and
//! immutable by design, so this is a new contract at a new address; attestations
//! anchored under v1 stay verifiable in v1 forever.
//!
//! v2 exists because of one question v1 cannot answer: **is this still true
//! right now?** v1 stores an issuance timestamp and nothing else, so an
//! assertion that has since lapsed or been withdrawn reads as current to anyone
//! verifying from the chain alone — and that verifier is the whole point of
//! anchoring. See `docs/ADR-001-anchor-capabilities.md`.
//!
//! What v2 adds:
//!
//! - `valid_until` — an explicit end of validity.
//! - revocation — recorded on chain, not only in the institution's own trail.
//! - `pack_hash` — the identity of the policy pack *as applied*, parameters
//!   included, so a verifier can tell a rule at one threshold from the same
//!   rule at another. A pack name and version number cannot express that.
//! - `jurisdiction` — which regime the rule encoded.
//!
//! Still true from v1, and non-negotiable: no personal data on chain. Every
//! field here is a hash, a coded symbol, an address or a timestamp.

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
    AlreadyRevoked = 7,
    InvalidValidity = 8,
    PackVersionTooOld = 9,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    UseCaseConfig(Symbol),
    Authorized(Address),
    Attestation(Symbol, BytesN<32>),
    Revocation(Symbol, BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Verdict {
    Pass,
    Fail,
    Review,
}

/// What a relying party actually asks. One read-only call, no interpretation
/// left to the caller — the ordering (revoked before expired) is the order a
/// supervisor would read them.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AttestationStatus {
    NotFound,
    Valid,
    Expired,
    Revoked,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UseCaseConfig {
    pub active: bool,
    /// Attestations citing an older pack are refused. This is how an admin
    /// retires a superseded policy without touching the contract: publish the
    /// new pack, raise the floor.
    pub min_pack_version: u32,
}

/// What a submitter asserts. Grouped rather than passed as nine positional
/// arguments: the call site is read by people reviewing what was anchored, and
/// `(verdict, pack_hash, 1, BR, result_hash, None)` is not readable.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttestationInput {
    pub verdict: Verdict,
    pub pack_hash: BytesN<32>,
    pub pack_version: u32,
    pub jurisdiction: Symbol,
    pub result_hash: BytesN<32>,
    /// `None` means indefinite, which should be rare and deliberate.
    pub valid_until: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttestationRecord {
    pub verdict: Verdict,
    /// Identity of the policy pack as applied, parameters included.
    pub pack_hash: BytesN<32>,
    pub pack_version: u32,
    pub jurisdiction: Symbol,
    /// Commitment over the per-predicate outcomes, binding the verdict to them.
    pub result_hash: BytesN<32>,
    pub submitted_by: Address,
    pub issued_at: u64,
    /// `None` means indefinite, which should be rare and deliberate.
    pub valid_until: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Revocation {
    pub revoked_at: u64,
    /// Coded reason, never free text — free text is how personal data leaks
    /// onto a public ledger.
    pub reason: Symbol,
    pub revoked_by: Address,
}

#[contract]
pub struct AttestationRegistry;

#[contractimpl]
impl AttestationRegistry {
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
        evidence_hash: BytesN<32>,
        input: AttestationInput,
    ) -> u32 {
        submitter.require_auth();

        if !Self::is_authorized(&env, &submitter) {
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
        if input.pack_version < config.min_pack_version {
            panic_with_error!(&env, Error::PackVersionTooOld);
        }

        let key = DataKey::Attestation(use_case_id.clone(), evidence_hash.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::AttestationExists);
        }

        let issued_at = env.ledger().timestamp();
        // An expiry at or before issuance is never what the caller meant, and
        // silently storing it would produce a record born expired.
        if let Some(until) = input.valid_until {
            if until <= issued_at {
                panic_with_error!(&env, Error::InvalidValidity);
            }
        }

        let record = AttestationRecord {
            verdict: input.verdict,
            pack_hash: input.pack_hash,
            pack_version: input.pack_version,
            jurisdiction: input.jurisdiction,
            result_hash: input.result_hash,
            submitted_by: submitter,
            issued_at,
            valid_until: input.valid_until,
        };

        env.storage().persistent().set(&key, &record);

        env.events().publish(
            (symbol_short!("attest"), use_case_id, evidence_hash),
            record,
        );

        env.ledger().sequence()
    }

    /// Withdraw an attestation. The original issuer or the admin may do it.
    ///
    /// The issuer must still be an authorized submitter. A key that has been
    /// removed from the whitelist — rotated, or compromised and revoked — must
    /// not be able to withdraw valid attestations; that would turn a stolen key
    /// into a denial-of-service against the institution's own record. The admin
    /// can always act, so there is no lockout.
    pub fn revoke_attestation(
        env: Env,
        revoker: Address,
        use_case_id: Symbol,
        evidence_hash: BytesN<32>,
        reason: Symbol,
    ) {
        revoker.require_auth();

        let att_key = DataKey::Attestation(use_case_id.clone(), evidence_hash.clone());
        let record: AttestationRecord = match env.storage().persistent().get(&att_key) {
            Some(r) => r,
            None => panic_with_error!(&env, Error::AttestationNotFound),
        };

        let rev_key = DataKey::Revocation(use_case_id.clone(), evidence_hash.clone());
        // The first withdrawal stands. Re-revoking would let someone rewrite
        // when it happened, which is the one fact a revocation exists to fix.
        if env.storage().persistent().has(&rev_key) {
            panic_with_error!(&env, Error::AlreadyRevoked);
        }

        let admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(a) => a,
            None => panic_with_error!(&env, Error::AdminOnly),
        };

        let is_admin = revoker == admin;
        let is_issuer = revoker == record.submitted_by && Self::is_authorized(&env, &revoker);
        if !is_admin && !is_issuer {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        let revocation = Revocation {
            revoked_at: env.ledger().timestamp(),
            reason,
            revoked_by: revoker,
        };

        env.storage().persistent().set(&rev_key, &revocation);

        env.events().publish(
            (symbol_short!("revoke"), use_case_id, evidence_hash),
            revocation,
        );
    }

    /// Read-only. Returns the record as stored, without interpreting it.
    pub fn verify_attestation(
        env: Env,
        use_case_id: Symbol,
        evidence_hash: BytesN<32>,
    ) -> Option<AttestationRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Attestation(use_case_id, evidence_hash))
    }

    pub fn get_revocation(
        env: Env,
        use_case_id: Symbol,
        evidence_hash: BytesN<32>,
    ) -> Option<Revocation> {
        env.storage()
            .persistent()
            .get(&DataKey::Revocation(use_case_id, evidence_hash))
    }

    /// The question a relying party is actually asking, answered in one call
    /// against the current ledger time. Revocation outranks expiry, because a
    /// withdrawn assertion was never valid to begin with for the period in
    /// dispute, and that is the order a supervisor reads them in.
    pub fn status(env: Env, use_case_id: Symbol, evidence_hash: BytesN<32>) -> AttestationStatus {
        let record: AttestationRecord = match env.storage().persistent().get(&DataKey::Attestation(
            use_case_id.clone(),
            evidence_hash.clone(),
        )) {
            Some(r) => r,
            None => return AttestationStatus::NotFound,
        };

        let now = env.ledger().timestamp();

        if let Some(rev) = env
            .storage()
            .persistent()
            .get::<DataKey, Revocation>(&DataKey::Revocation(use_case_id, evidence_hash))
        {
            if rev.revoked_at <= now {
                return AttestationStatus::Revoked;
            }
        }

        if let Some(until) = record.valid_until {
            if until <= now {
                return AttestationStatus::Expired;
            }
        }

        AttestationStatus::Valid
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized")
    }

    pub fn is_submitter_authorized(env: Env, submitter: Address) -> bool {
        Self::is_authorized(&env, &submitter)
    }

    fn is_authorized(env: &Env, submitter: &Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Authorized(submitter.clone()))
            .unwrap_or(false)
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
