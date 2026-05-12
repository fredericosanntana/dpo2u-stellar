CONTRACT := anticorruption-attestation
WASM := target/wasm32v1-none/release/anticorruption_attestation.wasm
OPTIMIZED := target/wasm32v1-none/release/anticorruption_attestation.optimized.wasm
NETWORK ?= testnet
IDENTITY ?= dpo2u-deployer

.PHONY: all build test optimize fmt clippy deploy clean

all: test build optimize

test:
	cargo test --manifest-path ../../Cargo.toml -p $(CONTRACT)

build:
	stellar contract build

optimize: build
	stellar contract optimize --wasm $(WASM)

fmt:
	cargo fmt --all

clippy:
	cargo clippy --workspace -- -D warnings

deploy: optimize
	stellar contract deploy \
		--wasm $(OPTIMIZED) \
		--source $(IDENTITY) \
		--network $(NETWORK) \
		-- __constructor --admin $$(stellar keys address $(IDENTITY))

clean:
	cargo clean
