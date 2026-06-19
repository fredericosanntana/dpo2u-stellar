#![no_std]

use por_verifier::{PorVerifierClient, Proof as ZkProof, VerificationKey as ZkVk};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    panic_with_error, symbol_short, xdr::ToXdr, Address, BytesN, Env, IntoVal, Symbol, U256, Vec,
};

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[contracterror]
#[repr(u32)]
pub enum GateError {
    Unauthorized = 1,
    AttestationMissing = 2,
    AttestationNotPass = 3,
    EvidenceHashMismatch = 4,
    EvidenceExpired = 5,
    EvidenceReplay = 6,
    VerifierNotSet = 7,
    ZkVerifyFailed = 8,
    BadProofSignals = 9,
    BadProofContext = 10,
    ProofNotPass = 11,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum Verdict {
    Pass,
    Fail,
    Review,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct AttestationRecord {
    pub verdict: Verdict,
    pub predicate_set: Symbol,
    pub predicate_version: u32,
    pub submitted_by: Address,
    pub timestamp: u64,
    pub metadata_hash: BytesN<32>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DefindexInstruction {
    Unwind(Address, i128),
    Invest(Address, i128),
    SwapExactIn(Address, Address, i128, i128, u64),
    SwapExactOut(Address, Address, i128, i128, u64),
}

#[contracttype]
#[derive(Clone)]
pub struct PorVk {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

#[contracttype]
#[derive(Clone)]
pub struct PorProof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    AttestationContract,
    VaultContract,
    UseCase,
    Operator(Address),
    ConsumedEvidence(BytesN<32>),
    VerifierAddr,
    VerifierVk,
}

#[contract]
pub struct DefindexRebalanceGate;

#[contractimpl]
impl DefindexRebalanceGate {
    pub fn __constructor(
        env: Env,
        admin: Address,
        attestation_contract: Address,
        vault_contract: Address,
        use_case_id: Symbol,
    ) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::AttestationContract, &attestation_contract);
        env.storage()
            .instance()
            .set(&DataKey::VaultContract, &vault_contract);
        env.storage().instance().set(&DataKey::UseCase, &use_case_id);
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized")
    }

    pub fn attestation_contract(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::AttestationContract)
            .expect("contract not initialized")
    }

    pub fn vault_contract(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::VaultContract)
            .expect("contract not initialized")
    }

    pub fn use_case_id(env: Env) -> Symbol {
        env.storage()
            .instance()
            .get(&DataKey::UseCase)
            .expect("contract not initialized")
    }

    pub fn verifier_contract(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::VerifierAddr)
    }

    pub fn is_operator(env: Env, operator: Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Operator(operator))
            .unwrap_or(false)
    }

    pub fn derive_evidence_hash(
        env: Env,
        operator: Address,
        scope: Symbol,
        nonce: u64,
        expires_at: u64,
        instructions: Vec<DefindexInstruction>,
    ) -> BytesN<32> {
        Self::derive_evidence_hash_for_payload(
            &env,
            &operator,
            &scope,
            nonce,
            expires_at,
            &instructions,
        )
    }

    pub fn derive_zk_context(env: Env, evidence_hash: BytesN<32>) -> BytesN<32> {
        Self::derive_zk_context_for_evidence_hash(&env, &evidence_hash)
    }

    pub fn authorize_operator(env: Env, admin: Address, operator: Address, allowed: bool) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Operator(operator.clone()), &allowed);
        env.events()
            .publish((symbol_short!("operator"), operator), allowed);
    }

    pub fn set_vault_contract(env: Env, admin: Address, vault_contract: Address) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::VaultContract, &vault_contract);
    }

    pub fn set_use_case_id(env: Env, admin: Address, use_case_id: Symbol) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(&DataKey::UseCase, &use_case_id);
    }

    pub fn set_verifier(env: Env, admin: Address, verifier: Address, vk: PorVk) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(&DataKey::VerifierAddr, &verifier);
        env.storage().instance().set(&DataKey::VerifierVk, &vk);
        env.events().publish((symbol_short!("verifier"),), verifier);
    }

    pub fn execute_rebalance(
        env: Env,
        operator: Address,
        scope: Symbol,
        nonce: u64,
        expires_at: u64,
        evidence_hash: BytesN<32>,
        instructions: Vec<DefindexInstruction>,
    ) {
        Self::validate_common(
            &env,
            &operator,
            &scope,
            nonce,
            expires_at,
            &evidence_hash,
            &instructions,
        );

        let attestation_contract = Self::attestation_contract(env.clone());
        let use_case_id = Self::use_case_id(env.clone());
        let record: Option<AttestationRecord> = env.invoke_contract(
            &attestation_contract,
            &Symbol::new(&env, "verify_attestation"),
            (use_case_id.clone(), evidence_hash.clone()).into_val(&env),
        );

        let record = match record {
            Some(record) => record,
            None => panic_with_error!(&env, GateError::AttestationMissing),
        };

        if record.verdict != Verdict::Pass {
            panic_with_error!(&env, GateError::AttestationNotPass);
        }

        Self::forward_rebalance(
            &env,
            operator,
            scope,
            nonce,
            expires_at,
            evidence_hash,
            instructions,
            use_case_id,
            symbol_short!("attest"),
            None,
        );
    }

    pub fn execute_rebalance_with_proof(
        env: Env,
        operator: Address,
        scope: Symbol,
        nonce: u64,
        expires_at: u64,
        evidence_hash: BytesN<32>,
        instructions: Vec<DefindexInstruction>,
        proof: PorProof,
        pub_signals: Vec<Bn254Fr>,
    ) {
        Self::validate_common(
            &env,
            &operator,
            &scope,
            nonce,
            expires_at,
            &evidence_hash,
            &instructions,
        );

        if pub_signals.len() != 3 {
            panic_with_error!(&env, GateError::BadProofSignals);
        }
        if pub_signals.get(0).unwrap().to_u256() != U256::from_u32(&env, 1) {
            panic_with_error!(&env, GateError::ProofNotPass);
        }

        let expected_context = Self::derive_zk_context_for_evidence_hash(&env, &evidence_hash);
        let proof_context = pub_signals.get(2).unwrap().to_bytes();
        if proof_context != expected_context {
            panic_with_error!(&env, GateError::BadProofContext);
        }

        let verifier: Address = match env.storage().instance().get(&DataKey::VerifierAddr) {
            Some(a) => a,
            None => panic_with_error!(&env, GateError::VerifierNotSet),
        };
        let vk: PorVk = match env.storage().instance().get(&DataKey::VerifierVk) {
            Some(v) => v,
            None => panic_with_error!(&env, GateError::VerifierNotSet),
        };

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

        let ok = PorVerifierClient::new(&env, &verifier).verify_proof(&zk_vk, &zk_proof, &pub_signals);
        if !ok {
            panic_with_error!(&env, GateError::ZkVerifyFailed);
        }

        let use_case_id = Self::use_case_id(env.clone());
        Self::forward_rebalance(
            &env,
            operator,
            scope,
            nonce,
            expires_at,
            evidence_hash,
            instructions,
            use_case_id,
            symbol_short!("zk"),
            Some(expected_context),
        );
    }

    fn validate_common(
        env: &Env,
        operator: &Address,
        scope: &Symbol,
        nonce: u64,
        expires_at: u64,
        evidence_hash: &BytesN<32>,
        instructions: &Vec<DefindexInstruction>,
    ) {
        operator.require_auth();
        if !Self::is_operator(env.clone(), operator.clone()) {
            panic_with_error!(env, GateError::Unauthorized);
        }
        if env.ledger().timestamp() > expires_at {
            panic_with_error!(env, GateError::EvidenceExpired);
        }
        if env
            .storage()
            .instance()
            .get(&DataKey::ConsumedEvidence(evidence_hash.clone()))
            .unwrap_or(false)
        {
            panic_with_error!(env, GateError::EvidenceReplay);
        }

        let derived_evidence_hash = Self::derive_evidence_hash_for_payload(
            env,
            operator,
            scope,
            nonce,
            expires_at,
            instructions,
        );
        if evidence_hash != &derived_evidence_hash {
            panic_with_error!(env, GateError::EvidenceHashMismatch);
        }
    }

    fn forward_rebalance(
        env: &Env,
        operator: Address,
        scope: Symbol,
        nonce: u64,
        expires_at: u64,
        evidence_hash: BytesN<32>,
        instructions: Vec<DefindexInstruction>,
        use_case_id: Symbol,
        auth_mode: Symbol,
        zk_context: Option<BytesN<32>>,
    ) {
        env.storage()
            .instance()
            .set(&DataKey::ConsumedEvidence(evidence_hash.clone()), &true);

        let vault_contract = Self::vault_contract(env.clone());
        let gate_address = env.current_contract_address();
        env.invoke_contract::<()>(
            &vault_contract,
            &Symbol::new(env, "rebalance"),
            (gate_address.clone(), instructions.clone()).into_val(env),
        );

        env.events().publish(
            (symbol_short!("rebalance"), gate_address),
            (
                operator,
                evidence_hash,
                use_case_id,
                auth_mode,
                scope,
                nonce,
                expires_at,
                zk_context,
                instructions.len(),
            ),
        );
    }

    fn assert_admin(env: &Env, claimed_admin: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");
        if claimed_admin != &admin {
            panic_with_error!(env, GateError::Unauthorized);
        }
    }

    fn derive_evidence_hash_for_payload(
        env: &Env,
        operator: &Address,
        scope: &Symbol,
        nonce: u64,
        expires_at: u64,
        instructions: &Vec<DefindexInstruction>,
    ) -> BytesN<32> {
        let payload = (
            symbol_short!("df_gate"),
            env.current_contract_address(),
            Self::vault_contract(env.clone()),
            Self::use_case_id(env.clone()),
            scope.clone(),
            nonce,
            expires_at,
            operator.clone(),
            instructions.clone(),
        )
            .to_xdr(env);
        env.crypto().sha256(&payload).to_bytes()
    }

    fn derive_zk_context_for_evidence_hash(env: &Env, evidence_hash: &BytesN<32>) -> BytesN<32> {
        let digest = env
            .crypto()
            .sha256(&(symbol_short!("df_zkctx"), evidence_hash.clone()).to_xdr(env))
            .to_bytes();
        let mut arr = digest.to_array();
        arr[0] = 0;
        BytesN::from_array(env, &arr)
    }
}

#[cfg(test)]
mod test;
