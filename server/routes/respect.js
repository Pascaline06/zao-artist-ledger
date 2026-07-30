import { Router } from 'express';
import { formatUnits } from 'viem';
import { optimismClient, CONTRACTS } from '../lib/chains.js';

const router = Router();

const ERC20_ABI = [
  {
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint8' }],
  },
];

const ERC1155_ABI = [
  {
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

router.get('/:address', async (req, res) => {
  const { address } = req.params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'invalid address' });
  }

  try {
    const [rawOgBalance, ogDecimals, zorBalance] = await Promise.all([
      optimismClient.readContract({
        address: CONTRACTS.ogRespect, abi: ERC20_ABI,
        functionName: 'balanceOf', args: [address],
      }),
      optimismClient.readContract({
        address: CONTRACTS.ogRespect, abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      optimismClient.readContract({
        address: CONTRACTS.zorRespect, abi: ERC1155_ABI,
        functionName: 'balanceOf', args: [address, 0n],
      }),
    ]);

    // Real bug fix: was returning the raw uint256 (e.g. 18-decimal token
    // units) instead of a human-readable number. Read decimals() from the
    // contract itself rather than assume 18, and format properly.
    const ogRespectFormatted = formatUnits(rawOgBalance, ogDecimals);

    res.json({
      address,
      ogRespect: ogRespectFormatted,
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
