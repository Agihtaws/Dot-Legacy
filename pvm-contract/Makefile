TARGETS = all clean
.PHONY: $(TARGETS)
.SILENT: $(TARGETS)

all:
	RUSTC_BOOTSTRAP=1 RUSTFLAGS="-Zunstable-options -Cpanic=immediate-abort" \
		cargo build --release
	polkatool link --strip --output contract.polkavm \
		target/riscv64emac-unknown-none-polkavm/release/contract

clean:
	cargo clean