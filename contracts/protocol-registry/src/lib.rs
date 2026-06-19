#![no_std]
#![allow(deprecated)] // events.publish() works fine; #[contractevent] migration is later
//! DPO2U — `protocol-registry`.
//!
//! A **canonical, multi-issuer attestation registry**: a neutral protocol surface where
//! authorized issuers register claim attestations and downstream contracts ask the
//! canonical question `verify_attestation_proof(...) -> bool`.
//!
//! FINAL MVP SCOPE AFTER SPRINT 3
//! - Canonical verification = existence AND active policy AND issuer profile fit AND
//!   issuer stake fit AND not-revoked AND temporal validity AND root match.
//! - Revocation is explicit and per-attestation (`revoke_attestation(...)`).
//! - Issuer trust is no longer only a global boolean: this MVP adds `IssuerProfile` plus
//!   per-issuer claim/jurisdiction scope gates, per-policy minimum trust tier, and a
//!   symbolic stake ledger with admin slashing.
//!
//! HONEST LIMITS
//! - This is still NOT decentralized governance, NOT value-moving escrow, and NOT quorum-based.
//! - Stake is symbolic/admin-credited for testnet governance modeling; no token custody.
//! - `verify_attestation_proof` is still a deterministic canonical check, NOT a ZK proof.
//!
//! TWO DISTINCT KILL-SWITCHES
//! - `set_claim_policy(..., active=false)` disables the entire `(claim_type, jurisdiction)` lane.
//! - `revoke_attestation(...)` tombstones one canonical attestation slot.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    BytesN, Env, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Caller is not authorized for the requested mutation, or legacy issuer allow-flag is false.
    NotAuthorized = 1,
    /// No active claim policy exists for (claim_type, jurisdiction).
    PolicyInactive = 2,
    /// (subject_commitment, claim_type, jurisdiction) is already registered.
    AttestationExists = 3,
    /// Requested attestation slot does not exist.
    AttestationNotFound = 4,
    /// Caller is not the admin.
    AdminOnly = 5,
    /// Constructor called twice.
    AlreadyInitialized = 6,
    /// Attestation was already revoked.
    AlreadyRevoked = 7,
    /// Issuer profile is inactive or expired.
    IssuerProfileInvalid = 8,
    /// Issuer is outside claim scope.
    IssuerClaimScopeDenied = 9,
    /// Issuer is outside jurisdiction scope.
    IssuerJurisdictionScopeDenied = 10,
    /// Issuer trust tier does not satisfy the claim policy.
    IssuerTrustTierTooLow = 11,
    /// Issuer symbolic stake does not satisfy the claim policy.
    IssuerStakeTooLow = 12,
    /// Slash amount exceeds issuer stake.
    InsufficientStake = 13,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    /// Legacy compatibility flag: still useful as a coarse on/off gate.
    AuthorizedIssuer(Address),
    /// Claim policy keyed by (claim_type, jurisdiction).
    ClaimPolicy(Symbol, Symbol),
    /// Canonical attestation slot keyed by (subject_commitment, claim_type, jurisdiction).
    Attestation(BytesN<32>, Symbol, Symbol),
    /// Revocation tombstone keyed by the same canonical triple.
    Revocation(BytesN<32>, Symbol, Symbol),
    /// Structured issuer profile keyed by issuer address.
    IssuerProfile(Address),
    /// Per-issuer claim scope override. Missing = allow by default in this MVP.
    IssuerClaimScope(Address, Symbol),
    /// Per-issuer jurisdiction scope override. Missing = allow by default in this MVP.
    IssuerJurisdictionScope(Address, Symbol),
    /// Symbolic issuer stake balance. Admin credited/slashed in this MVP.
    IssuerStake(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttestationRecord {
    pub issuer: Address,
    pub claim_type: Symbol,
    pub jurisdiction: Symbol,
    /// Unix-seconds expiry. `0` = no expiry.
    pub valid_until: u64,
    pub attestation_root: BytesN<32>,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RevocationRecord {
    pub revoked_by: Address,
    pub revoked_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssuerProfile {
    pub active: bool,
    pub trust_tier: u32,
    /// Unix-seconds expiry. `0` = no expiry.
    pub valid_until: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimPolicy {
    pub active: bool,
    /// Minimum trust tier required from the issuer profile.
    pub min_trust_tier: u32,
    /// Minimum symbolic stake required from the issuer.
    pub min_stake: i128,
}

#[contract]
pub struct ProtocolRegistry;

#[contractimpl]
impl ProtocolRegistry {
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Legacy coarse authorization gate kept for compatibility. Also ensures the issuer has a
    /// default profile so old flows remain green when `min_trust_tier == 1`.
    pub fn authorize_issuer(env: Env, admin: Address, issuer: Address, allowed: bool) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::AuthorizedIssuer(issuer.clone()), &allowed);

        let profile = IssuerProfile {
            active: allowed,
            trust_tier: 1,
            valid_until: 0,
        };
        env.storage()
            .instance()
            .set(&DataKey::IssuerProfile(issuer.clone()), &profile);

        env.events()
            .publish((symbol_short!("issuer"), issuer), allowed);
    }

    /// Structured issuer profile configuration for Sprint 2 trust-model MVP.
    pub fn configure_issuer_profile(
        env: Env,
        admin: Address,
        issuer: Address,
        active: bool,
        trust_tier: u32,
        valid_until: u64,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let profile = IssuerProfile {
            active,
            trust_tier,
            valid_until,
        };
        env.storage()
            .instance()
            .set(&DataKey::IssuerProfile(issuer.clone()), &profile);
        env.storage()
            .instance()
            .set(&DataKey::AuthorizedIssuer(issuer.clone()), &active);

        env.events().publish(
            (symbol_short!("iprofile"), issuer),
            (active, trust_tier, valid_until),
        );
    }

    pub fn set_issuer_claim_scope(
        env: Env,
        admin: Address,
        issuer: Address,
        claim_type: Symbol,
        allowed: bool,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(
            &DataKey::IssuerClaimScope(issuer.clone(), claim_type.clone()),
            &allowed,
        );
        env.events()
            .publish((symbol_short!("iscopec"), issuer, claim_type), allowed);
    }

    pub fn set_issuer_jurisdiction_scope(
        env: Env,
        admin: Address,
        issuer: Address,
        jurisdiction: Symbol,
        allowed: bool,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(
            &DataKey::IssuerJurisdictionScope(issuer.clone(), jurisdiction.clone()),
            &allowed,
        );
        env.events()
            .publish((symbol_short!("iscopej"), issuer, jurisdiction), allowed);
    }

    /// Compatibility setter: keeps the old 4-arg interface, defaulting the minimum trust tier to 1.
    pub fn set_claim_policy(
        env: Env,
        admin: Address,
        claim_type: Symbol,
        jurisdiction: Symbol,
        active: bool,
    ) {
        Self::set_claim_policy_requirements(env, admin, claim_type, jurisdiction, active, 1);
    }

    pub fn set_claim_policy_requirements(
        env: Env,
        admin: Address,
        claim_type: Symbol,
        jurisdiction: Symbol,
        active: bool,
        min_trust_tier: u32,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        Self::write_claim_policy(&env, claim_type, jurisdiction, active, min_trust_tier, 0);
    }

    pub fn set_policy_stake(
        env: Env,
        admin: Address,
        claim_type: Symbol,
        jurisdiction: Symbol,
        active: bool,
        min_trust_tier: u32,
        min_stake: i128,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        Self::write_claim_policy(
            &env,
            claim_type,
            jurisdiction,
            active,
            min_trust_tier,
            min_stake,
        );
    }

    fn write_claim_policy(
        env: &Env,
        claim_type: Symbol,
        jurisdiction: Symbol,
        active: bool,
        min_trust_tier: u32,
        min_stake: i128,
    ) {
        let policy = ClaimPolicy {
            active,
            min_trust_tier,
            min_stake,
        };
        env.storage().instance().set(
            &DataKey::ClaimPolicy(claim_type.clone(), jurisdiction.clone()),
            &policy,
        );
        env.events().publish(
            (symbol_short!("policy"), claim_type, jurisdiction),
            (active, min_trust_tier, min_stake),
        );
    }

    pub fn credit_issuer_stake(env: Env, admin: Address, issuer: Address, amount: i128) -> i128 {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        let stake = Self::issuer_stake(env.clone(), issuer.clone()) + amount;
        env.storage()
            .instance()
            .set(&DataKey::IssuerStake(issuer.clone()), &stake);
        env.events()
            .publish((symbol_short!("stake"), issuer), stake);
        stake
    }

    pub fn slash_issuer(env: Env, admin: Address, issuer: Address, amount: i128) -> i128 {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        let current = Self::issuer_stake(env.clone(), issuer.clone());
        if amount > current {
            panic_with_error!(&env, Error::InsufficientStake);
        }
        let stake = current - amount;
        env.storage()
            .instance()
            .set(&DataKey::IssuerStake(issuer.clone()), &stake);
        env.events()
            .publish((symbol_short!("slash"), issuer), stake);
        stake
    }

    pub fn register_attestation(
        env: Env,
        issuer: Address,
        subject_commitment: BytesN<32>,
        claim_type: Symbol,
        jurisdiction: Symbol,
        valid_until: u64,
        attestation_root: BytesN<32>,
    ) -> u32 {
        issuer.require_auth();

        let policy = Self::claim_policy_struct(&env, &claim_type, &jurisdiction);
        if !policy.active {
            panic_with_error!(&env, Error::PolicyInactive);
        }
        Self::assert_issuer_fits_policy(&env, &issuer, &claim_type, &jurisdiction, &policy);

        let key = DataKey::Attestation(
            subject_commitment.clone(),
            claim_type.clone(),
            jurisdiction.clone(),
        );
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::AttestationExists);
        }

        let record = AttestationRecord {
            issuer: issuer.clone(),
            claim_type: claim_type.clone(),
            jurisdiction,
            valid_until,
            attestation_root,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &record);
        env.events().publish(
            (symbol_short!("register"), subject_commitment, claim_type),
            record,
        );
        env.ledger().sequence()
    }

    pub fn revoke_attestation(
        env: Env,
        caller: Address,
        subject_commitment: BytesN<32>,
        claim_type: Symbol,
        jurisdiction: Symbol,
    ) {
        caller.require_auth();

        let att_key = DataKey::Attestation(
            subject_commitment.clone(),
            claim_type.clone(),
            jurisdiction.clone(),
        );
        let record: AttestationRecord = match env.storage().persistent().get(&att_key) {
            Some(r) => r,
            None => panic_with_error!(&env, Error::AttestationNotFound),
        };

        if !Self::is_admin(&env, &caller) && caller != record.issuer {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        let rev_key = DataKey::Revocation(
            subject_commitment.clone(),
            claim_type.clone(),
            jurisdiction.clone(),
        );
        if env.storage().persistent().has(&rev_key) {
            panic_with_error!(&env, Error::AlreadyRevoked);
        }

        let rev = RevocationRecord {
            revoked_by: caller,
            revoked_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&rev_key, &rev);
        env.events().publish(
            (symbol_short!("revoke"), subject_commitment, claim_type),
            rev,
        );
    }

    pub fn get_attestation(
        env: Env,
        subject_commitment: BytesN<32>,
        claim_type: Symbol,
        jurisdiction: Symbol,
    ) -> Option<AttestationRecord> {
        env.storage().persistent().get(&DataKey::Attestation(
            subject_commitment,
            claim_type,
            jurisdiction,
        ))
    }

    pub fn get_issuer_profile(env: Env, issuer: Address) -> Option<IssuerProfile> {
        env.storage()
            .instance()
            .get(&DataKey::IssuerProfile(issuer))
    }

    pub fn issuer_claim_scope(env: Env, issuer: Address, claim_type: Symbol) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::IssuerClaimScope(issuer, claim_type))
            .unwrap_or(true)
    }

    pub fn issuer_jurisdiction_scope(env: Env, issuer: Address, jurisdiction: Symbol) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::IssuerJurisdictionScope(issuer, jurisdiction))
            .unwrap_or(true)
    }

    pub fn get_claim_policy(env: Env, claim_type: Symbol, jurisdiction: Symbol) -> ClaimPolicy {
        Self::claim_policy_struct(&env, &claim_type, &jurisdiction)
    }

    pub fn issuer_stake(env: Env, issuer: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::IssuerStake(issuer))
            .unwrap_or(0)
    }

    pub fn is_attestation_active(
        env: Env,
        subject_commitment: BytesN<32>,
        claim_type: Symbol,
        jurisdiction: Symbol,
    ) -> bool {
        let record: AttestationRecord = match env.storage().persistent().get(&DataKey::Attestation(
            subject_commitment.clone(),
            claim_type.clone(),
            jurisdiction.clone(),
        )) {
            Some(r) => r,
            None => return false,
        };

        let policy = Self::claim_policy_struct(&env, &claim_type, &jurisdiction);
        if !policy.active {
            return false;
        }
        if Self::is_revoked(&env, &subject_commitment, &claim_type, &jurisdiction) {
            return false;
        }
        if record.valid_until != 0 && env.ledger().timestamp() > record.valid_until {
            return false;
        }
        Self::issuer_fits_policy_bool(&env, &record.issuer, &claim_type, &jurisdiction, &policy)
    }

    pub fn verify_attestation_proof(
        env: Env,
        subject_commitment: BytesN<32>,
        claim_type: Symbol,
        jurisdiction: Symbol,
        attestation_root: BytesN<32>,
    ) -> bool {
        let record: AttestationRecord = match env.storage().persistent().get(&DataKey::Attestation(
            subject_commitment.clone(),
            claim_type.clone(),
            jurisdiction.clone(),
        )) {
            Some(r) => r,
            None => return false,
        };

        if !Self::is_attestation_active(env.clone(), subject_commitment, claim_type, jurisdiction) {
            return false;
        }
        record.attestation_root == attestation_root
    }

    pub fn is_authorized_issuer(env: Env, issuer: Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::AuthorizedIssuer(issuer))
            .unwrap_or(false)
    }

    pub fn claim_policy_active(env: Env, claim_type: Symbol, jurisdiction: Symbol) -> bool {
        Self::claim_policy_struct(&env, &claim_type, &jurisdiction).active
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

    fn is_admin(env: &Env, caller: &Address) -> bool {
        let admin: Option<Address> = env.storage().instance().get(&DataKey::Admin);
        match admin {
            Some(a) => caller == &a,
            None => false,
        }
    }

    fn claim_policy_struct(env: &Env, claim_type: &Symbol, jurisdiction: &Symbol) -> ClaimPolicy {
        env.storage()
            .instance()
            .get(&DataKey::ClaimPolicy(
                claim_type.clone(),
                jurisdiction.clone(),
            ))
            .unwrap_or(ClaimPolicy {
                active: false,
                min_trust_tier: 1,
                min_stake: 0,
            })
    }

    fn assert_issuer_fits_policy(
        env: &Env,
        issuer: &Address,
        claim_type: &Symbol,
        jurisdiction: &Symbol,
        policy: &ClaimPolicy,
    ) {
        let legacy_allowed: bool = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedIssuer(issuer.clone()))
            .unwrap_or(false);
        if !legacy_allowed {
            panic_with_error!(env, Error::NotAuthorized);
        }

        let maybe_profile: Option<IssuerProfile> = env
            .storage()
            .instance()
            .get(&DataKey::IssuerProfile(issuer.clone()));

        if let Some(profile) = maybe_profile {
            if !profile.active
                || (profile.valid_until != 0 && env.ledger().timestamp() > profile.valid_until)
            {
                panic_with_error!(env, Error::IssuerProfileInvalid);
            }
            let claim_ok: bool = env
                .storage()
                .instance()
                .get(&DataKey::IssuerClaimScope(
                    issuer.clone(),
                    claim_type.clone(),
                ))
                .unwrap_or(true);
            if !claim_ok {
                panic_with_error!(env, Error::IssuerClaimScopeDenied);
            }
            let juris_ok: bool = env
                .storage()
                .instance()
                .get(&DataKey::IssuerJurisdictionScope(
                    issuer.clone(),
                    jurisdiction.clone(),
                ))
                .unwrap_or(true);
            if !juris_ok {
                panic_with_error!(env, Error::IssuerJurisdictionScopeDenied);
            }
            if profile.trust_tier < policy.min_trust_tier {
                panic_with_error!(env, Error::IssuerTrustTierTooLow);
            }
        } else if policy.min_trust_tier > 1 {
            panic_with_error!(env, Error::IssuerTrustTierTooLow);
        }

        let stake: i128 = env
            .storage()
            .instance()
            .get(&DataKey::IssuerStake(issuer.clone()))
            .unwrap_or(0);
        if stake < policy.min_stake {
            panic_with_error!(env, Error::IssuerStakeTooLow);
        }
    }

    fn issuer_fits_policy_bool(
        env: &Env,
        issuer: &Address,
        claim_type: &Symbol,
        jurisdiction: &Symbol,
        policy: &ClaimPolicy,
    ) -> bool {
        let legacy_allowed: bool = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedIssuer(issuer.clone()))
            .unwrap_or(false);
        if !legacy_allowed {
            return false;
        }

        let maybe_profile: Option<IssuerProfile> = env
            .storage()
            .instance()
            .get(&DataKey::IssuerProfile(issuer.clone()));

        if let Some(profile) = maybe_profile {
            if !profile.active
                || (profile.valid_until != 0 && env.ledger().timestamp() > profile.valid_until)
            {
                return false;
            }
            let claim_ok: bool = env
                .storage()
                .instance()
                .get(&DataKey::IssuerClaimScope(
                    issuer.clone(),
                    claim_type.clone(),
                ))
                .unwrap_or(true);
            if !claim_ok {
                return false;
            }
            let juris_ok: bool = env
                .storage()
                .instance()
                .get(&DataKey::IssuerJurisdictionScope(
                    issuer.clone(),
                    jurisdiction.clone(),
                ))
                .unwrap_or(true);
            if !juris_ok {
                return false;
            }
            if profile.trust_tier < policy.min_trust_tier {
                return false;
            }
        } else {
            if policy.min_trust_tier > 1 {
                return false;
            }
        }

        let stake: i128 = env
            .storage()
            .instance()
            .get(&DataKey::IssuerStake(issuer.clone()))
            .unwrap_or(0);
        stake >= policy.min_stake
    }

    fn is_revoked(
        env: &Env,
        subject_commitment: &BytesN<32>,
        claim_type: &Symbol,
        jurisdiction: &Symbol,
    ) -> bool {
        env.storage().persistent().has(&DataKey::Revocation(
            subject_commitment.clone(),
            claim_type.clone(),
            jurisdiction.clone(),
        ))
    }
}

#[cfg(test)]
mod test;
