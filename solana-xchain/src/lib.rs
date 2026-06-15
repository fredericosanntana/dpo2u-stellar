//! DPO2U — Solana xchain-attest (moonshot #6 ported to a 3rd chain).
//!
//! Verifies a BN254 Groth16 proof RELAYED from another chain ON-CHAIN, using
//! groth16-solana (Solana's `alt_bn128` syscalls — the same curve as Ethereum/Stellar),
//! then stores a CrossChainClaim PDA. The verifying keys are PINNED in the program
//! (fail-closed): the relayer selects which pinned vk via `vk_id` but can never supply
//! one. Two pinned vks:
//!   vk_id = 0 → PoR vk (data-protection / proof-of-reserve family).
//!   vk_id = 1 → STRUCTURAL governance vk (governance_predicate: Hiroshima / EU-AIA).
//!
//! Instruction data (369 bytes): vk_id(1) || pi_a(64, ALREADY NEGATED by the relayer) ||
//! pi_b(128) || pi_c(64) || pub_signals(3×32) || origin(16, ascii). proof_context = pub[2].
//! Accounts: [payer(signer,writable), claim_pda(writable), system_program].
#![allow(unexpected_cfgs)]

use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};
use hex_literal::hex;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

// PINNED vk #0 — PoR Groth16/BN254 (same one verified on Stellar + EVM).
const VK_ALPHA: [u8; 64] = hex!("2cec5151e2fdedfcdbe288e824373bca017c15e0c956ad7e2ae1a19c71e55ddb1919755f45dc0e9e1b8d741fe603415a48bbd6ddaf4e47d840b3407b7750517e");
const VK_BETA: [u8; 128] = hex!("0220b010d35eb26a60fe065ced7ea45d133f805f597fc9e69b3c3e2db266ebd316da8a35d9e89bf0df1ae6fe83197f832a70929d5f995f391cca8a778ec333472d04f6cec34536982004c719aff2f6fe7ecb2d538fc6dcf227beaf4b755f4cc110ea7bf90ae597d25684de7fa7b0e0451635eaaf03420ed7afe43b8f5f0544b3");
const VK_GAMMA: [u8; 128] = hex!("198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa");
const VK_DELTA: [u8; 128] = hex!("1dc73e4d393b47d61fc6cd3492b68c4f6d143050f9ecf7c452df42e3e03f44db129b4023d9ab2a2d7b1507e847390a372b9efe9379441b7d5b6162c455d58b200e07518b96e69a9faa1f984ca2bebd3741bf39d18b555975bb95e37be1c4929e214cbef78ce932ee804b4956805d5ba7572b810fa097751aeab1467b0e7b0041");
const VK_IC0: [u8; 64] = hex!("02a0e2865fa13db1115575f90d9ab27bd507e75b08bd4491ddc711ecf33cf2331fc4866cab4d7dbb3def3061e29852306f4d5c459bc21501d3361eb8bde7abc9");
const VK_IC1: [u8; 64] = hex!("2797d0d429e5ad9ea9a67b08878921e71a19f4e3e5c563ceec4fc7ad23f15a6d24489c6f318cb2085dc608830ff60e1a1e7c28bfce2fecb5e1aa6eb41eaefbe2");
const VK_IC2: [u8; 64] = hex!("2fa62a941ec345e793ac934d6a6a4227f94c3e81880fa2d03a1ecacd7f5f695e085134d9279694ed1adda33e5a7f3505649d43548951f97d7b7e56c692de8821");
const VK_IC3: [u8; 64] = hex!("136d4cdb127c973a4c333c1d8706748355ae2e6341af682e677142f561f644c71bf98dadd9cb1d95a43607bcaa1e3eb7e4c0b1497c53317bea3d7680ed849b78");

// PINNED vk #1 — STRUCTURAL governance vk (governance_predicate: Hiroshima N-of-M / EU-AIA tier).
const VK_GOV_ALPHA: [u8; 64] = hex!("1c1c57401bbe5754a2eebd7e695a499f7a9344362280b12aad43407bd0646bac030855d752f967a3dbd4e3f138e30295105625a361cc52aa05413e9c6e871dd9");
const VK_GOV_BETA: [u8; 128] = hex!("03fd148e434d4c24d808777f03b346388f82b58d7b7919727b37a7e7f0cf3d191e0cb1eed536bbb01f6caacf7e2882d2f599b12d13c0532008eeb5d53f147b8b2df68f0669c93f6ae8ac1b9e28d13326dc730e773bb5ce1ea788f0d17554e4c92bb52df14666765a9ebe1596fdd9430631141d7f01c5dd468fdc3f1c9a908896");
const VK_GOV_GAMMA: [u8; 128] = hex!("198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa");
const VK_GOV_DELTA: [u8; 128] = hex!("22443b5b3a16fa8e3fe187eb2971f79469f1368cfa0d968a4abf75df865b85ab1909dc0a7e25cfc20a27b4bfd0e978c67368935ebef4951bd16b8041d126f3f516c918bae7a4a28a2c75671eccdc387b4128ed66f51171fe093cf6f4b837ea430a2063b7f8fc6d859fd12de1bb7443d8b102637f9c81081bb8013c02d99624c3");
const VK_GOV_IC0: [u8; 64] = hex!("00bd1035f7d4480765a2e3c0d1507e2cff0cf72453ced7c024667fe70f30ed670e2d7ce3d80dd9dcc133bbd56e6b9a30539ad06756da328565b26d322a3e9cd4");
const VK_GOV_IC1: [u8; 64] = hex!("2ffca12e14a5ed820e8f8ef3b7368318fb7941fa38ec23864476db9eaa2557fc09bc3d3e319ec5b8eb227f0dceab7610d779f87f0ff97c2a13ea0ef1d5f5d482");
const VK_GOV_IC2: [u8; 64] = hex!("0e9ff147bfa6bdd0a657763e5036d41b250d4336668814f11fa13436937cf69d20e2f2ba0941e9dbf61690e10a81b1430e556ea96c9783d36b6f9b2a64cdd503");
const VK_GOV_IC3: [u8; 64] = hex!("1678c1d4b6658efdcb7e3f347d5e656a481f091c9302ecfbf4214613237311fe211f3d89f82329edfef632707967936ae9b1133a0243f197fbd633d041b488e9");

const CLAIM_SPACE: usize = 16 + 32 + 32 + 1 + 8; // origin + proof_context + relayer + verified + slot
const SEED: &[u8] = b"xclaim";

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if data.len() < 369 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let vk_id = data[0];
    let pi_a: [u8; 64] = data[1..65].try_into().unwrap();
    let pi_b: [u8; 128] = data[65..193].try_into().unwrap();
    let pi_c: [u8; 64] = data[193..257].try_into().unwrap();
    let mut pubs = [[0u8; 32]; 3];
    pubs[0].copy_from_slice(&data[257..289]);
    pubs[1].copy_from_slice(&data[289..321]);
    pubs[2].copy_from_slice(&data[321..353]);
    let origin: [u8; 16] = data[353..369].try_into().unwrap();
    let proof_context = &data[321..353]; // pub[2]

    // Select the PINNED vk (submitter never supplies one).
    let (alpha, beta, gamma, delta, ic) = if vk_id == 1 {
        (VK_GOV_ALPHA, VK_GOV_BETA, VK_GOV_GAMMA, VK_GOV_DELTA,
         [VK_GOV_IC0, VK_GOV_IC1, VK_GOV_IC2, VK_GOV_IC3])
    } else {
        (VK_ALPHA, VK_BETA, VK_GAMMA, VK_DELTA, [VK_IC0, VK_IC1, VK_IC2, VK_IC3])
    };
    let vk = Groth16Verifyingkey {
        nr_pubinputs: 3,
        vk_alpha_g1: alpha,
        vk_beta_g2: beta,
        vk_gamme_g2: gamma,
        vk_delta_g2: delta,
        vk_ic: &ic,
    };
    let mut verifier = Groth16Verifier::new(&pi_a, &pi_b, &pi_c, &pubs, &vk)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    verifier
        .verify()
        .map_err(|_| ProgramError::Custom(8))?; // ZkVerifyFailed — fail-closed

    let it = &mut accounts.iter();
    let payer = next_account_info(it)?;
    let claim = next_account_info(it)?;
    let system = next_account_info(it)?;

    let (pda, bump) = Pubkey::find_program_address(&[SEED, proof_context], program_id);
    if pda != *claim.key {
        return Err(ProgramError::InvalidArgument);
    }
    if claim.data_is_empty() {
        let lamports = Rent::get()?.minimum_balance(CLAIM_SPACE);
        invoke_signed(
            &system_instruction::create_account(
                payer.key,
                claim.key,
                lamports,
                CLAIM_SPACE as u64,
                program_id,
            ),
            &[payer.clone(), claim.clone(), system.clone()],
            &[&[SEED, proof_context, &[bump]]],
        )?;
    }

    let mut d = claim.try_borrow_mut_data()?;
    d[0..16].copy_from_slice(&origin);
    d[16..48].copy_from_slice(proof_context);
    d[48..80].copy_from_slice(payer.key.as_ref());
    d[80] = 1; // zk_verified
    d[81..89].copy_from_slice(&Clock::get()?.slot.to_le_bytes());

    if vk_id == 1 {
        msg!("DPO2U xchain-attest: STRUCTURAL AI-governance proof (governance_predicate) verified ON-CHAIN (alt_bn128). zk_verified=true");
    } else {
        msg!("DPO2U xchain-attest: BN254 Groth16 verified ON-CHAIN (alt_bn128); cross-chain claim sealed. zk_verified=true");
    }
    Ok(())
}
