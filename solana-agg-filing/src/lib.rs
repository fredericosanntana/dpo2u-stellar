//! DPO2U — Solana agg-filing (moonshot #5 seal, ported to Solana).
//!
//! Seals the RESULT of a SnarkPack aggregate (commitment + count + verdict + context_root)
//! and verifies ONE representative constituent member proof ON-CHAIN via groth16-solana
//! (alt_bn128) against a PINNED vk (fail-closed; the submitter selects vk_id but never
//! supplies a vk). Same honesty as the Soroban agg-filing: the SnarkPack aggregate is
//! verified OFF-CHAIN (no GT on alt_bn128 either); the on-chain seal attests the result +
//! one constituent proof verified on-chain.
//!
//! Pinned vks: vk_id 0 = PoR, 1 = structural governance, 2 = jurisdiction-compliance.
//!
//! Instruction (438 bytes): vk_id(1) | agg_commitment(32) | count(4 LE) | verdict(1) |
//! context_root(32) | member_pi_a(64, NEGATED) | member_pi_b(128) | member_pi_c(64) |
//! member_pub(3×32) | scope(16, ascii). Accounts: [payer(signer,w), agg_pda(w), system].
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

// vk #0 — PoR
const A0: [u8; 64] = hex!("2cec5151e2fdedfcdbe288e824373bca017c15e0c956ad7e2ae1a19c71e55ddb1919755f45dc0e9e1b8d741fe603415a48bbd6ddaf4e47d840b3407b7750517e");
const B0: [u8; 128] = hex!("0220b010d35eb26a60fe065ced7ea45d133f805f597fc9e69b3c3e2db266ebd316da8a35d9e89bf0df1ae6fe83197f832a70929d5f995f391cca8a778ec333472d04f6cec34536982004c719aff2f6fe7ecb2d538fc6dcf227beaf4b755f4cc110ea7bf90ae597d25684de7fa7b0e0451635eaaf03420ed7afe43b8f5f0544b3");
const G0: [u8; 128] = hex!("198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa");
const D0: [u8; 128] = hex!("1dc73e4d393b47d61fc6cd3492b68c4f6d143050f9ecf7c452df42e3e03f44db129b4023d9ab2a2d7b1507e847390a372b9efe9379441b7d5b6162c455d58b200e07518b96e69a9faa1f984ca2bebd3741bf39d18b555975bb95e37be1c4929e214cbef78ce932ee804b4956805d5ba7572b810fa097751aeab1467b0e7b0041");
const I00: [u8; 64] = hex!("02a0e2865fa13db1115575f90d9ab27bd507e75b08bd4491ddc711ecf33cf2331fc4866cab4d7dbb3def3061e29852306f4d5c459bc21501d3361eb8bde7abc9");
const I01: [u8; 64] = hex!("2797d0d429e5ad9ea9a67b08878921e71a19f4e3e5c563ceec4fc7ad23f15a6d24489c6f318cb2085dc608830ff60e1a1e7c28bfce2fecb5e1aa6eb41eaefbe2");
const I02: [u8; 64] = hex!("2fa62a941ec345e793ac934d6a6a4227f94c3e81880fa2d03a1ecacd7f5f695e085134d9279694ed1adda33e5a7f3505649d43548951f97d7b7e56c692de8821");
const I03: [u8; 64] = hex!("136d4cdb127c973a4c333c1d8706748355ae2e6341af682e677142f561f644c71bf98dadd9cb1d95a43607bcaa1e3eb7e4c0b1497c53317bea3d7680ed849b78");

// vk #1 — structural governance
const A1: [u8; 64] = hex!("1c1c57401bbe5754a2eebd7e695a499f7a9344362280b12aad43407bd0646bac030855d752f967a3dbd4e3f138e30295105625a361cc52aa05413e9c6e871dd9");
const B1: [u8; 128] = hex!("03fd148e434d4c24d808777f03b346388f82b58d7b7919727b37a7e7f0cf3d191e0cb1eed536bbb01f6caacf7e2882d2f599b12d13c0532008eeb5d53f147b8b2df68f0669c93f6ae8ac1b9e28d13326dc730e773bb5ce1ea788f0d17554e4c92bb52df14666765a9ebe1596fdd9430631141d7f01c5dd468fdc3f1c9a908896");
const G1: [u8; 128] = hex!("198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa");
const D1: [u8; 128] = hex!("22443b5b3a16fa8e3fe187eb2971f79469f1368cfa0d968a4abf75df865b85ab1909dc0a7e25cfc20a27b4bfd0e978c67368935ebef4951bd16b8041d126f3f516c918bae7a4a28a2c75671eccdc387b4128ed66f51171fe093cf6f4b837ea430a2063b7f8fc6d859fd12de1bb7443d8b102637f9c81081bb8013c02d99624c3");
const I10: [u8; 64] = hex!("00bd1035f7d4480765a2e3c0d1507e2cff0cf72453ced7c024667fe70f30ed670e2d7ce3d80dd9dcc133bbd56e6b9a30539ad06756da328565b26d322a3e9cd4");
const I11: [u8; 64] = hex!("2ffca12e14a5ed820e8f8ef3b7368318fb7941fa38ec23864476db9eaa2557fc09bc3d3e319ec5b8eb227f0dceab7610d779f87f0ff97c2a13ea0ef1d5f5d482");
const I12: [u8; 64] = hex!("0e9ff147bfa6bdd0a657763e5036d41b250d4336668814f11fa13436937cf69d20e2f2ba0941e9dbf61690e10a81b1430e556ea96c9783d36b6f9b2a64cdd503");
const I13: [u8; 64] = hex!("1678c1d4b6658efdcb7e3f347d5e656a481f091c9302ecfbf4214613237311fe211f3d89f82329edfef632707967936ae9b1133a0243f197fbd633d041b488e9");

// vk #2 — jurisdiction-compliance
const A2: [u8; 64] = hex!("10a57399208ea17495d6bb8cdce99b8416ed45f45721dfca7fb2769692174b3017de6a19f626c2baffb9aa1669b163768730d5d5004221352fc0a962ab23e740");
const B2: [u8; 128] = hex!("177cab37ccd0f3a3519a1631d9e4dbd26c4fc0e2ddc2de14cc8e6e6335cdd3f921973c00d72ffa72e65281999d369c904291f329139ef5c2d02ed03511f02ce50c776c306a7f3ea6d888c2f0dec3eed030ccfb17262f44afc006d9f345f1b19f20e748a5b056f8eec6c0a43278acb56128b47ed3e0a3b2934fa61542db1313d4");
const G2K: [u8; 128] = hex!("198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa");
const D2: [u8; 128] = hex!("1f1ff9e9ba4bf13706df47f3949e6b2c3b79f2cf4f9b469a9100d2922c9ed7d52b5d3f0ab121bb653816d4872ea97673a778e67a07bbd0acd53467127aa68ae01070fed07b41b9a8a1e62a9a0a62ea83ba73ba40ceccb997e855761f5d27d63f2fa881deecceabd53db2d7b63c4b82b268eb35a37b82e418b5085cfafe22b819");
const I20: [u8; 64] = hex!("2034ca4c796ab202fc3097f464d8910644fefc7e33b8d10b66b63dc71032f78c1b2a177d1dea8a4d49dc6194db5a9490dc9fcb3560e2001f9c74dbe750c38063");
const I21: [u8; 64] = hex!("21b736506bd5391febd6de478af3f4e283060404a9313ef5e1c913002122b6f10297cc45036dd38e44d0e40ca71ad426365446d3d8cb896d781553dae24c0872");
const I22: [u8; 64] = hex!("003e02df40aab0d99c3ea87043d90d11c24e85c209d2b43c19517d161e8e8d8b035ae3fadcbef7e2b6a10fed53121d90e2f12a2fabd4760472df2496030c276c");
const I23: [u8; 64] = hex!("2cc9fef632569c4e7593db5a24deeeec081309b16cd7be362dcfc787cfb7b6f719256a486e785ea5b11fe1e52b3793eedf0a5067488554ce6041e6c099f42967");

const CLAIM_SPACE: usize = 32 + 4 + 1 + 32 + 16 + 1 + 32 + 8; // commitment+count+verdict+ctxroot+scope+member_ok+relayer+slot = 126
const SEED: &[u8] = b"aggclaim";

entrypoint!(process_instruction);

pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if data.len() < 438 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let vk_id = data[0];
    let agg_commitment = &data[1..33];
    let count = &data[33..37];
    let verdict = data[37];
    let context_root = &data[38..70];
    let pi_a: [u8; 64] = data[70..134].try_into().unwrap();
    let pi_b: [u8; 128] = data[134..262].try_into().unwrap();
    let pi_c: [u8; 64] = data[262..326].try_into().unwrap();
    let mut pubs = [[0u8; 32]; 3];
    pubs[0].copy_from_slice(&data[326..358]);
    pubs[1].copy_from_slice(&data[358..390]);
    pubs[2].copy_from_slice(&data[390..422]);
    let scope: [u8; 16] = data[422..438].try_into().unwrap();

    // Verify ONE member proof on-chain against the PINNED vk (fail-closed).
    let (a, b, g, d, ic) = match vk_id {
        1 => (A1, B1, G1, D1, [I10, I11, I12, I13]),
        2 => (A2, B2, G2K, D2, [I20, I21, I22, I23]),
        _ => (A0, B0, G0, D0, [I00, I01, I02, I03]),
    };
    let vk = Groth16Verifyingkey {
        nr_pubinputs: 3,
        vk_alpha_g1: a,
        vk_beta_g2: b,
        vk_gamme_g2: g,
        vk_delta_g2: d,
        vk_ic: &ic,
    };
    Groth16Verifier::new(&pi_a, &pi_b, &pi_c, &pubs, &vk)
        .map_err(|_| ProgramError::InvalidInstructionData)?
        .verify()
        .map_err(|_| ProgramError::Custom(8))?;

    // Store the AggregateClaim PDA: seeds [b"aggclaim", scope].
    let it = &mut accounts.iter();
    let payer = next_account_info(it)?;
    let claim = next_account_info(it)?;
    let system = next_account_info(it)?;
    let (pda, bump) = Pubkey::find_program_address(&[SEED, &scope], program_id);
    if pda != *claim.key {
        return Err(ProgramError::InvalidArgument);
    }
    if claim.data_is_empty() {
        let lamports = Rent::get()?.minimum_balance(CLAIM_SPACE);
        invoke_signed(
            &system_instruction::create_account(payer.key, claim.key, lamports, CLAIM_SPACE as u64, program_id),
            &[payer.clone(), claim.clone(), system.clone()],
            &[&[SEED, &scope, &[bump]]],
        )?;
    }
    let mut o = claim.try_borrow_mut_data()?;
    o[0..32].copy_from_slice(agg_commitment);
    o[32..36].copy_from_slice(count);
    o[36] = verdict;
    o[37..69].copy_from_slice(context_root);
    o[69..85].copy_from_slice(&scope);
    o[85] = 1; // member_zk_verified (on-chain)
    o[86..118].copy_from_slice(payer.key.as_ref());
    o[118..126].copy_from_slice(&Clock::get()?.slot.to_le_bytes());

    msg!("DPO2U agg-filing (Solana): SnarkPack aggregate sealed; one member proof verified ON-CHAIN (alt_bn128). off_chain_verified + member_zk_verified=true");
    Ok(())
}
