import { createPublicClient, http } from 'viem';
import { base, optimism } from 'viem/chains';
import 'dotenv/config';

// Base client - EAS attestations + ZABAL Empire live here
export const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// Optimism client - Respect (OG Respect ERC-20 + ZOR Respect ERC-1155) live here.
// This is deliberate: ZAO governance roles run on OP, not Base. Don't merge these.
export const optimismClient = createPublicClient({
  chain: optimism,
  transport: http(process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io'),
});

// Confirmed contract addresses (from ZABAL Gamez llms.txt, 2026-05-23 snapshot).
// Re-verify these against zabalgamez.com/llms.txt before relying on them in production -
// addresses are the one thing worth double-checking, not taking on trust from any single source.
export const CONTRACTS = {
  ogRespect: '0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957', // ERC-20, Optimism
  zorRespect: '0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c', // ERC-1155, Optimism
  zabalToken: '0xbB48f19B0494Ff7C1fE5Dc2032aeEE14312f0b07', // ERC-20, Base
  zabalEmpire: '0xe0faa499d6711870211505bd9ae2105206af1462', // Empire Builder wrapper, Base
  easBase: '0x4200000000000000000000000000000000000021', // EAS contract, Base
};
