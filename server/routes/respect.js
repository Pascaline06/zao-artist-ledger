import { Router } from 'express';
import { optimismClient, CONTRACTS } from '../lib/chains.js';

const router = Router();

// Minimal ABIs - just the read functions we need
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

const ERC1155_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

// GET /api/respect/:address
// Returns OG Respect (ERC-20) balance + ZOR Respect (ERC-1155, token id 0) balance.
// NOTE on ZOR: this reads token id 0 as a starting point. ZOR is minted per fractal
// session, so real usage may span multiple token ids - confirm the id scheme against
// the fractalbotmarch2026 contract before treating this as a complete picture.
router.get('/:address', async (req, res) => {
  const { address } = req.params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'invalid address' });
  }

  try {
    const [ogBalance, zorBalance] = await Promise.all([
      optimismClient.readContract({
        address: CONTRACTS.ogRespect,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }),
      optimismClient.readContract({
        address: CONTRACTS.zorRespect,
        abi: ERC1155_ABI,
        functionName: 'balanceOf',
        args: [address, 0n],
      }),
    ]);

    res.json({
      address,
      ogRespect: ogBalance.toString(),
      zorRespect: zorBalance.toString(),
      source: 'optimism-onchain-read',
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[respect] read failed', err);
    res.status(502).json({ error: 'could not read Respect contracts', detail: err.message });
  }
});

export default router;
