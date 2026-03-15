#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(all(not(test), feature = "pvm"))]
use uapi::{HostFn, HostFnImpl as api, ReturnFlags};

#[cfg(all(not(test), feature = "pvm"))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe {
        core::arch::asm!("unimp");
        core::hint::unreachable_unchecked();
    }
}

// ---------------------------------------------------------------------------
// ABI selectors
// ---------------------------------------------------------------------------
const SELECTOR_VERIFY_SHARES:    [u8; 4] = [0x5f, 0x1a, 0x3d, 0x9c];
const SELECTOR_RECONSTRUCT_HASH: [u8; 4] = [0x2a, 0x7e, 0x88, 0x14];

// ---------------------------------------------------------------------------
// Prime field — 2^128 - 59 (fits in u128, is prime)
// ---------------------------------------------------------------------------
// 2^127 - 1 — Mersenne prime M_127, proven prime 1876. Fits in u128 with headroom.
pub const PRIME: u128 = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

/// Modular addition — overflow safe
#[inline(always)]
pub fn add_mod(a: u128, b: u128) -> u128 {
    let (sum, overflow) = a.overflowing_add(b);
    if overflow || sum >= PRIME { sum.wrapping_sub(PRIME) } else { sum }
}

/// Modular subtraction — underflow safe
#[inline(always)]
pub fn sub_mod(a: u128, b: u128) -> u128 {
    if a >= b { a - b } else { PRIME - (b - a) }
}

/// Modular multiplication using Russian peasant algorithm.
///
/// Why not 256-bit split: the hi-word reassembly overflows u128
/// when inputs are near PRIME. Russian peasant only uses add_mod
/// (which is provably overflow-safe) so it is always correct.
/// 128 iterations — acceptable for a smart contract.
pub fn mul_mod(a: u128, b: u128) -> u128 {
    let mut result: u128 = 0;
    let mut a = a % PRIME;
    let mut b = b % PRIME;
    while b > 0 {
        if b & 1 == 1 {
            result = add_mod(result, a);
        }
        a = add_mod(a, a); // double a mod PRIME
        b >>= 1;
    }
    result
}

/// Fast modular exponentiation: base^exp mod PRIME
pub fn pow_mod(mut base: u128, mut exp: u128) -> u128 {
    let mut result: u128 = 1;
    base %= PRIME;
    while exp > 0 {
        if exp & 1 == 1 { result = mul_mod(result, base); }
        base = mul_mod(base, base);
        exp >>= 1;
    }
    result
}

/// Modular inverse via Fermat's little theorem: a^(PRIME-2) mod PRIME
pub fn mod_inv(a: u128) -> u128 {
    pow_mod(a, PRIME - 2)
}

// ---------------------------------------------------------------------------
// Lagrange interpolation at x=0
//
// Given K (index_i, share_i) pairs where share_i = f(index_i),
// reconstructs f(0) = secret.
//
// f(0) = Σ_i  y_i * Π_{j≠i} ( x_j / (x_j - x_i) )  mod PRIME
// ---------------------------------------------------------------------------
pub fn lagrange_at_zero(shares: &[u128], indices: &[u128], k: usize) -> u128 {
    let mut secret: u128 = 0;
    for i in 0..k {
        let x_i = indices[i] % PRIME;
        let y_i = shares[i]  % PRIME;
        let mut num: u128 = 1;
        let mut den: u128 = 1;
        for j in 0..k {
            if i == j { continue; }
            let x_j = indices[j] % PRIME;
            num = mul_mod(num, x_j);
            den = mul_mod(den, sub_mod(x_j, x_i));
        }
        let basis = mul_mod(num, mod_inv(den));
        secret    = add_mod(secret, mul_mod(y_i, basis));
    }
    secret
}

// ---------------------------------------------------------------------------
// Secret hash — keccak256 on PVM, identity mock in tests
// ---------------------------------------------------------------------------
#[cfg(all(not(test), feature = "pvm"))]
pub fn hash_secret(secret: u128) -> [u8; 32] {
    let mut buf = [0u8; 32];
    buf[16..32].copy_from_slice(&secret.to_be_bytes());
    let mut hash = [0u8; 32];
    api::hash_keccak_256(&buf, &mut hash);
    hash
}

#[cfg(any(test, not(feature = "pvm")))]
pub fn hash_secret(secret: u128) -> [u8; 32] {
    let mut h = [0u8; 32];
    h[16..32].copy_from_slice(&secret.to_be_bytes());
    h
}

// ---------------------------------------------------------------------------
// ABI codec
// ---------------------------------------------------------------------------
pub fn read_u128_slot(data: &[u8], offset: usize) -> u128 {
    let mut buf = [0u8; 16];
    buf.copy_from_slice(&data[offset + 16..offset + 32]);
    u128::from_be_bytes(buf)
}

pub fn read_u32_slot(data: &[u8], offset: usize) -> u32 {
    let mut buf = [0u8; 4];
    buf.copy_from_slice(&data[offset + 28..offset + 32]);
    u32::from_be_bytes(buf)
}

pub fn read_bytes32(data: &[u8], offset: usize) -> [u8; 32] {
    let mut buf = [0u8; 32];
    buf.copy_from_slice(&data[offset..offset + 32]);
    buf
}

pub fn write_bool(output: &mut [u8], slot: usize, val: bool) {
    output[slot * 32 + 31] = if val { 1 } else { 0 };
}

pub fn write_bytes32(output: &mut [u8], offset: usize, val: &[u8; 32]) {
    output[offset..offset + 32].copy_from_slice(val);
}

const MAX_K: usize = 10;

pub fn decode_uint_array(data: &[u8], abi_offset: usize) -> ([u128; MAX_K], usize) {
    let len      = read_u32_slot(data, abi_offset) as usize;
    let safe_len = len.min(MAX_K);
    let mut arr  = [0u128; MAX_K];
    for i in 0..safe_len {
        arr[i] = read_u128_slot(data, abi_offset + 32 + i * 32);
    }
    (arr, safe_len)
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------
pub fn verify_shares_logic(
    shares:      &[u128],
    indices:     &[u128],
    threshold:   usize,
    secret_hash: &[u8; 32],
) -> bool {
    if threshold == 0 || shares.len() < threshold || indices.len() < threshold {
        return false;
    }
    let reconstructed = lagrange_at_zero(
        &shares[..threshold],
        &indices[..threshold],
        threshold,
    );
    hash_secret(reconstructed) == *secret_hash
}

// ---------------------------------------------------------------------------
// PVM entry points
// ---------------------------------------------------------------------------
#[cfg(all(not(test), feature = "pvm"))]
#[no_mangle]
#[polkavm_derive::polkavm_export]
pub extern "C" fn deploy() {}

#[cfg(all(not(test), feature = "pvm"))]
#[no_mangle]
#[polkavm_derive::polkavm_export]
pub extern "C" fn call() {
    let mut selector = [0u8; 4];
    api::call_data_copy(&mut selector, 0);
    match selector {
        s if s == SELECTOR_VERIFY_SHARES    => handle_verify_shares(),
        s if s == SELECTOR_RECONSTRUCT_HASH => handle_reconstruct_hash(),
        _                                   => api::return_value(ReturnFlags::REVERT, &[]),
    }
}

#[cfg(all(not(test), feature = "pvm"))]
fn handle_verify_shares() {
    const BUF: usize = 4 + 32 * 30;
    let mut data  = [0u8; BUF];
    let read_len  = (api::call_data_size() as usize).min(BUF);
    api::call_data_copy(&mut data[..read_len], 0);
    let p           = &data[4..];
    let so          = read_u128_slot(p, 0)  as usize;
    let io          = read_u128_slot(p, 32) as usize;
    let threshold   = read_u32_slot(p, 64)  as usize;
    let secret_hash = read_bytes32(p, 96);
    let (shares, _)  = decode_uint_array(p, so);
    let (indices, _) = decode_uint_array(p, io);
    let valid = verify_shares_logic(
        &shares[..threshold.min(MAX_K)],
        &indices[..threshold.min(MAX_K)],
        threshold,
        &secret_hash,
    );
    let mut out = [0u8; 32];
    write_bool(&mut out, 0, valid);
    api::return_value(ReturnFlags::empty(), &out);
}

#[cfg(all(not(test), feature = "pvm"))]
fn handle_reconstruct_hash() {
    const BUF: usize = 4 + 32 * 25;
    let mut data  = [0u8; BUF];
    let read_len  = (api::call_data_size() as usize).min(BUF);
    api::call_data_copy(&mut data[..read_len], 0);
    let p         = &data[4..];
    let so        = read_u128_slot(p, 0)  as usize;
    let io        = read_u128_slot(p, 32) as usize;
    let threshold = read_u32_slot(p, 64)  as usize;
    let (shares, _)  = decode_uint_array(p, so);
    let (indices, _) = decode_uint_array(p, io);
    let reconstructed = if threshold == 0 { 0u128 } else {
        lagrange_at_zero(&shares[..threshold], &indices[..threshold], threshold)
    };
    let hash = hash_secret(reconstructed);
    let mut out = [0u8; 32];
    write_bytes32(&mut out, 0, &hash);
    api::return_value(ReturnFlags::empty(), &out);
}

// ---------------------------------------------------------------------------
// Tests — cargo test --no-default-features --target x86_64-pc-windows-msvc
// ---------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // Share generation helpers
    // Degree-1 polynomial: f(x) = secret + a1*x  (threshold = 2)
    // Degree-2 polynomial: f(x) = secret + a1*x + a2*x^2  (threshold = 3)
    // -----------------------------------------------------------------------

    fn shares_t2(secret: u128, a1: u128) -> ([u128; 5], [u128; 5]) {
        let mut s = [0u128; 5];
        let mut i = [0u128; 5];
        for n in 0..5usize {
            let x  = (n as u128) + 1;
            s[n]   = add_mod(secret % PRIME, mul_mod(a1, x));
            i[n]   = x;
        }
        (s, i)
    }

    fn shares_t3(secret: u128, a1: u128, a2: u128) -> ([u128; 5], [u128; 5]) {
        let mut s = [0u128; 5];
        let mut idx = [0u128; 5];
        for n in 0..5usize {
            let x   = (n as u128) + 1;
            let y   = add_mod(
                add_mod(secret % PRIME, mul_mod(a1, x)),
                mul_mod(a2, mul_mod(x, x)),
            );
            s[n]    = y;
            idx[n]  = x;
        }
        (s, idx)
    }

    // -----------------------------------------------------------------------
    // Modular arithmetic
    // -----------------------------------------------------------------------

    #[test]
    fn test_add_mod_wraps_at_prime() {
        assert_eq!(add_mod(PRIME - 1, 1), 0);
        assert_eq!(add_mod(PRIME - 1, 2), 1);
        assert_eq!(add_mod(0, 0), 0);
    }

    #[test]
    fn test_sub_mod_wraps() {
        assert_eq!(sub_mod(0, 1), PRIME - 1);
        assert_eq!(sub_mod(5, 3), 2);
        assert_eq!(sub_mod(3, 3), 0);
    }

    #[test]
    fn test_mul_mod_small_values() {
        assert_eq!(mul_mod(2, 3), 6);
        assert_eq!(mul_mod(0, 999), 0);
        assert_eq!(mul_mod(1, PRIME - 1), PRIME - 1);
        assert_eq!(mul_mod(PRIME - 1, 1), PRIME - 1);
    }

    #[test]
    fn test_mul_mod_large_values() {
        // (PRIME-1) * (PRIME-1) mod PRIME = 1  (since -1 * -1 = 1)
        assert_eq!(mul_mod(PRIME - 1, PRIME - 1), 1);
        // 2 * (PRIME-1) mod PRIME = PRIME - 2
        assert_eq!(mul_mod(2, PRIME - 1), PRIME - 2);
    }

    #[test]
    fn test_pow_mod() {
        assert_eq!(pow_mod(2, 10), 1024);
        assert_eq!(pow_mod(3, 0),  1);
        assert_eq!(pow_mod(0, 5),  0);
        assert_eq!(pow_mod(1, 1_000_000), 1);
    }

    #[test]
    fn test_mod_inverse_small() {
        let a: u128 = 7;
        let inv = mod_inv(a);
        assert_eq!(mul_mod(a, inv), 1, "7 * inv(7) mod p == 1");
    }

    #[test]
    fn test_mod_inverse_large() {
        let a: u128 = 12345678901234567890;
        let inv     = mod_inv(a);
        assert_eq!(mul_mod(a, inv), 1, "a * inv(a) mod p == 1");
    }

    #[test]
    fn test_mod_inverse_near_prime() {
        let a: u128 = PRIME - 1;
        let inv     = mod_inv(a);
        // inv(PRIME-1) = PRIME-1 since (-1)^(-1) = -1
        assert_eq!(mul_mod(a, inv), 1, "inv(PRIME-1) * (PRIME-1) == 1");
    }

    // -----------------------------------------------------------------------
    // Lagrange interpolation
    // -----------------------------------------------------------------------

    #[test]
    fn test_2_of_5_first_two() {
        let secret = 0xDEADBEEFCAFEBABEu128;
        let (s, i) = shares_t2(secret, 0x1234567890ABCDEFu128);
        assert_eq!(lagrange_at_zero(&s[..2], &i[..2], 2), secret);
    }

    #[test]
    fn test_2_of_5_shares_1_and_3() {
        let secret = 42_000_000_000_000_000u128;
        let (s, i) = shares_t2(secret, 99_999_999_999u128);
        let ps = [s[0], s[2]];
        let pi = [i[0], i[2]];
        assert_eq!(lagrange_at_zero(&ps, &pi, 2), secret);
    }

    #[test]
    fn test_2_of_5_shares_2_and_4() {
        let secret = 123_456_789u128;
        let (s, i) = shares_t2(secret, 777u128);
        let ps = [s[1], s[3]];
        let pi = [i[1], i[3]];
        assert_eq!(lagrange_at_zero(&ps, &pi, 2), secret);
    }

    #[test]
    fn test_3_of_5_first_three() {
        let secret = 0xABCDEF0123456789u128;
        let (s, i) = shares_t3(secret, 111u128, 222u128);
        assert_eq!(lagrange_at_zero(&s[..3], &i[..3], 3), secret);
    }

    #[test]
    fn test_3_of_5_shares_1_3_5() {
        let secret = 0xCAFEBABEu128;
        let (s, i) = shares_t3(secret, 500u128, 250u128);
        let ps = [s[0], s[2], s[4]];
        let pi = [i[0], i[2], i[4]];
        assert_eq!(lagrange_at_zero(&ps, &pi, 3), secret);
    }

    #[test]
    fn test_threshold_1_is_identity() {
        let secret = 99999u128;
        assert_eq!(lagrange_at_zero(&[secret], &[1u128], 1), secret);
    }

    // -----------------------------------------------------------------------
    // verify_shares_logic
    // -----------------------------------------------------------------------

    #[test]
    fn test_verify_valid_2_of_3() {
        let secret        = 0xFEEDFACEDEADBEEFu128;
        let expected_hash = hash_secret(secret);
        let (s, i)        = shares_t2(secret, 0x999u128);
        assert!(verify_shares_logic(&s[..2], &i[..2], 2, &expected_hash));
    }

    #[test]
    fn test_verify_valid_3_of_5() {
        let secret        = 0x0102030405060708u128;
        let expected_hash = hash_secret(secret);
        let (s, i)        = shares_t3(secret, 123u128, 456u128);
        assert!(verify_shares_logic(&s[..3], &i[..3], 3, &expected_hash));
    }

    #[test]
    fn test_verify_tampered_share_fails() {
        let secret        = 0xFEEDFACEDEADBEEFu128;
        let expected_hash = hash_secret(secret);
        let (mut s, i)    = shares_t2(secret, 0x999u128);
        s[0]              = s[0].wrapping_add(1); // tamper
        assert!(!verify_shares_logic(&s[..2], &i[..2], 2, &expected_hash));
    }

    #[test]
    fn test_verify_below_threshold_fails() {
        let hash = hash_secret(999);
        assert!(!verify_shares_logic(&[1u128], &[1u128], 2, &hash));
    }

    #[test]
    fn test_verify_zero_threshold_fails() {
        let hash = hash_secret(0);
        assert!(!verify_shares_logic(&[], &[], 0, &hash));
    }

    #[test]
    fn test_verify_wrong_hash_fails() {
        let secret        = 42u128;
        let wrong_hash    = hash_secret(43u128); // hash of a different secret
        let (s, i)        = shares_t2(secret, 100u128);
        assert!(!verify_shares_logic(&s[..2], &i[..2], 2, &wrong_hash));
    }
}