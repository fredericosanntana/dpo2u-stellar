#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec, token
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TenderStatus {
    AwaitingBids = 0,
    Closed = 1,
    Settled = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Tender {
    pub gov: Address,             // Orgao publico criando o edital
    pub token: Address,           // USDC ou XLM token address
    pub max_price: i128,          // Teto do valor
    pub requirements: String,     // Requisitos do edital (ex: "LGPD;ISO27001")
    pub status: TenderStatus,     // Status atual
    pub balance: i128,            // Fundos depositados no Escrow
    pub winner: Option<Address>,  // Empresa ganhadora
    pub winning_price: i128,      // Preço de fechamento
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bid {
    pub company: Address,
    pub price: i128,
    pub evidence_hash: String,    // O ZK-Proof Hash emitido pela DPO2U atestando o compliance
}

const TENDER_KEY: Symbol = symbol_short!("Tender");
const BIDS_KEY: Symbol = symbol_short!("Bids");

#[contract]
pub struct GovBiddingEscrow;

#[contractimpl]
impl GovBiddingEscrow {
    /// O Governo inicializa o edital e deposita os fundos no contrato.
    pub fn create_tender(
        env: Env,
        gov: Address,
        token: Address,
        max_price: i128,
        requirements: String,
    ) {
        gov.require_auth();

        if env.storage().instance().has(&TENDER_KEY) {
            panic!("Tender already initialized");
        }

        // Governo transfere os fundos maximos para o contrato (Escrow)
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&gov, &env.current_contract_address(), &max_price);

        let tender = Tender {
            gov,
            token,
            max_price,
            requirements,
            status: TenderStatus::AwaitingBids,
            balance: max_price,
            winner: None,
            winning_price: 0,
        };

        env.storage().instance().set(&TENDER_KEY, &tender);
        
        // Inicia a lista vazia de bids
        let bids: Vec<Bid> = Vec::new(&env);
        env.storage().instance().set(&BIDS_KEY, &bids);
    }

    /// As empresas submetem o preço e a Hash da atestação de compliance emitida pela DPO2U.
    pub fn submit_bid(
        env: Env,
        company: Address,
        price: i128,
        evidence_hash: String, // Opcional no futuro checar via oraculo nativo (cross-contract)
    ) {
        company.require_auth();

        let tender: Tender = env.storage().instance().get(&TENDER_KEY).expect("Tender not found");
        
        if tender.status != TenderStatus::AwaitingBids {
            panic!("Tender is not open for bids");
        }

        if price > tender.max_price {
            panic!("Bid price exceeds max tender price");
        }

        // Em producao on-chain o Smart Contract chamaria outro contrato "AttestationRegistry"
        // para verificar se o `evidence_hash` da `company` foi atestado por uma chave Minter do motor DPO2U.
        // Aqui mockamos que se o evidence_hash foi fornecido, o motor validou (Atestado on-chain).
        if evidence_hash.len() == 0 {
            panic!("Valid DPO2U evidence hash is required");
        }

        let mut bids: Vec<Bid> = env.storage().instance().get(&BIDS_KEY).expect("Bids not found");
        bids.push_back(Bid {
            company,
            price,
            evidence_hash,
        });

        env.storage().instance().set(&BIDS_KEY, &bids);
    }

    /// O Governo (ou o próprio oráculo da DPO2U) avalia os Bids e liquida.
    /// Escolhe o menor preço.
    pub fn settle_winner(env: Env) {
        let mut tender: Tender = env.storage().instance().get(&TENDER_KEY).expect("Tender not found");
        
        // Apenas o GOV ou um Admin pode liquidar
        tender.gov.require_auth();

        if tender.status != TenderStatus::AwaitingBids {
            panic!("Tender already closed or settled");
        }

        let bids: Vec<Bid> = env.storage().instance().get(&BIDS_KEY).expect("Bids not found");

        if bids.is_empty() {
            panic!("No valid bids received");
        }

        // Selecionar o menor preco
        let mut lowest_price = tender.max_price + 1;
        let mut winner_addr: Option<Address> = None;

        for bid in bids.iter() {
            if bid.price < lowest_price {
                lowest_price = bid.price;
                winner_addr = Some(bid.company);
            }
        }

        let winner = winner_addr.expect("Could not determine winner");

        // Transfere o valor da proposta vencedora para a empresa
        let token_client = token::Client::new(&env, &tender.token);
        token_client.transfer(&env.current_contract_address(), &winner, &lowest_price);

        // Devolve o troco (saving) para o governo
        let saving = tender.balance - lowest_price;
        if saving > 0 {
            token_client.transfer(&env.current_contract_address(), &tender.gov, &saving);
        }

        tender.status = TenderStatus::Settled;
        tender.winner = Some(winner);
        tender.winning_price = lowest_price;
        tender.balance = 0;

        env.storage().instance().set(&TENDER_KEY, &tender);
    }

    pub fn get_tender(env: Env) -> Tender {
        env.storage().instance().get(&TENDER_KEY).expect("Tender not found")
    }

    pub fn get_bids(env: Env) -> Vec<Bid> {
        env.storage().instance().get(&BIDS_KEY).expect("Bids not found")
    }
}
