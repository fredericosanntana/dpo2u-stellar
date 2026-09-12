// @dpo2u/core — the network-independent compliance core.
//
// Planes 1 to 3 of the architecture (policy as versioned code, evidence at the
// perimeter, evaluation and audit trail) plus the plane-5 adapter contract.
// Nothing here imports a blockchain SDK, and nothing here may: that constraint
// is the product, and a single leaked network type would end it.

export {
  canonicalize,
  hashCanonical,
  hashBytes,
  isHash32,
  assertHash32,
  type Canonical,
} from './canonical.js';

export {
  assertPredicateId,
  predicateHash,
  noValidation,
  type Verdict,
  type Jurisdiction,
  type EvidenceView,
  type Predicate,
  type PredicateContext,
  type PredicateOutcome,
  type BoundPredicate,
} from './predicate.js';

export {
  definePolicyPack,
  requiredFields,
  type PolicyPack,
  type PolicyPackInput,
} from './policy-pack.js';

export {
  evaluate,
  MissingEvidenceError,
  type Evaluation,
  type PredicateResult,
} from './engine.js';

export {
  createAttestation,
  attestationFromEvaluation,
  revoke,
  assessFreshness,
  isAcceptable,
  type Attestation,
  type AttestationInput,
  type Revocation,
  type FreshnessStatus,
  type FreshnessAssessment,
  type FreshnessPolicy,
} from './attestation.js';

export {
  toAnchorRecord,
  anchorFidelity,
  assertAnchorable,
  DuplicateAttestationError,
  NotAuthorizedError,
  UnpreservableSemanticsError,
  type ChainAdapter,
  type AnchorRecord,
  type AnchorReceipt,
  type AnchorFidelity,
  type NetworkDescriptor,
  type NetworkCapabilities,
} from './adapter.js';

export {
  AuditTrail,
  GENESIS_HASH,
  type TrailAction,
  type TrailEntry,
  type TrailEntryInput,
  type ChainVerification,
} from './trail.js';

export * from './predicates/index.js';
