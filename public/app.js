import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
sdk.actions.ready().catch(() => {});

// If launched as a real Farcaster Mini App with a signed-in user, skip the
// sign-in buttons entirely and load stats immediately - per Zaal's feedback,
// asking someone to approve again inside their own already-open Mini App is
// unnecessary friction.
(async () => {
  try {
    const context = await Promise.race([
      sdk.context,
      new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    const user = context?.user;
    if (user?.verifiedAddresses?.ethAddresses?.length) {
      window.__zaoAutoSignIn = {
        ethAddress: user.verifiedAddresses.ethAddresses[0],
        solAddresses: user.verifiedAddresses.solAddresses || [],
        username: user.username || null,
      };
    }
  } catch (err) {
    console.error('auto sign-in check failed', err);
  }
})();
import { createWalletClient, custom } from 'https://esm.sh/viem@2';
import { base } from 'https://esm.sh/viem@2/chains';

const EAS_ABI = [
  {
    name: 'attest',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'request', type: 'tuple',
      components: [
        { name: 'schema', type: 'bytes32' },
        { name: 'data', type: 'tuple', components: [
          { name: 'recipient', type: 'address' },
          { name: 'expirationTime', type: 'uint64' },
          { name: 'revocable', type: 'bool' },
          { name: 'refUID', type: 'bytes32' },
          { name: 'data', type: 'bytes' },
          { name: 'value', type: 'uint256' },
        ]},
      ],
    }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
];

const els = {
  siwfBtn: document.getElementById('siwf-btn'),
  siwfStatus: document.getElementById('siwf-status'),
  siwfFallbackLink: document.getElementById('siwf-fallback-link'),
  connectBtn: document.getElementById('connect-btn'),
  connectDivider: document.querySelector('.connect-divider'),
  identityPrompt: document.querySelector('.identity-prompt'),
  identityAddress: document.getElementById('identity-address'),
  mintBtn: document.getElementById('mint-btn'),
  mintStatus: document.getElementById('mint-status'),
  proofCard: document.getElementById('proof-card'),
  proofArtist: document.getElementById('proof-artist'),
  proofRespect: document.getElementById('proof-respect'),
  proofEmpire: document.getElementById('proof-empire'),
  proofWavewarz: document.getElementById('proof-wavewarz'),
  proofDate: document.getElementById('proof-date'),
  proofLink: document.getElementById('proof-link'),
  proofUrlFallback: document.getElementById('proof-url-fallback'),
  shareBtn: document.getElementById('share-btn'),
};

let currentAddress = null;
let currentStats = null;
let currentDisplayName = null;
let siwfPollTimer = null;
let siwfTimeoutTimer = null;
let wcProvider = null;

els.siwfBtn.addEventListener('click', signInWithFarcaster);
els.connectBtn.addEventListener('click', connectWalletDirectly);
els.mintBtn.addEventListener('click', mintAttestation);
els.shareBtn.addEventListener('click', shareProof);

// Check for an auto-detected Mini App sign-in (set above) shortly after load
setTimeout(async () => {
  if (window.__zaoAutoSignIn) {
    const { ethAddress, solAddresses, username } = window.__zaoAutoSignIn;
    currentAddress = ethAddress;
    currentDisplayName = username;
    els.identityPrompt.hidden = true;
    els.identityAddress.hidden = false;
    els.identityAddress.textContent = username ? `Signed in as @${username}` : `Signed in: ${ethAddress}`;
    els.siwfBtn.hidden = true;
    els.connectBtn.hidden = true;
    els.connectDivider.hidden = true;
    await loadStats(ethAddress, solAddresses);
  }
}, 1800);

function clearSiwfTimers() {
  if (siwfPollTimer) clearInterval(siwfPollTimer);
  if (siwfTimeoutTimer) clearTimeout(siwfTimeoutTimer);
  siwfPollTimer = null;
  siwfTimeoutTimer = null;
}

async function signInWithFarcaster() {
  els.siwfBtn.disabled = true;
  els.siwfBtn.textContent = 'Waiting for approval...';
  els.siwfStatus.hidden = false;
  els.siwfStatus.textContent = 'Opening Farcaster...';

  try {
    const { channelToken, url } = await fetchJSON('/api/siwf/create-channel', { method: 'POST' });

    els.siwfFallbackLink.href = url;
    els.siwfFallbackLink.hidden = false;
    window.open(url, '_blank');

    clearSiwfTimers();

    siwfPollTimer = setInterval(async () => {
      try {
        const status = await fetchJSON(`/api/siwf/status/${channelToken}`);
        if (status.state === 'completed') {
          clearSiwfTimers();
          els.siwfStatus.textContent = 'Loading your standing...';
          await handleSiwfSuccess(status);
        }
      } catch (err) {
        console.error('poll error', err);
      }
    }, 2000);

    siwfTimeoutTimer = setTimeout(() => {
      clearSiwfTimers();
      els.siwfStatus.textContent = 'Sign-in expired - tap to try again.';
      els.siwfBtn.disabled = false;
      els.siwfBtn.textContent = 'Sign in with Farcaster';
    }, 3 * 60 * 1000);
  } catch (err) {
    console.error(err);
    els.siwfStatus.textContent = `Could not start sign-in: ${err.message}`;
    els.siwfBtn.disabled = false;
    els.siwfBtn.textContent = 'Sign in with Farcaster';
  }
}

async function handleSiwfSuccess(status) {
  const ethAddresses = status.verifications.filter((v) => /^0x[a-fA-F0-9]{40}$/.test(v));
  const solAddresses = status.verifications.filter((v) => !/^0x[a-fA-F0-9]{40}$/.test(v));

  currentAddress = ethAddresses[0] || status.custody;
  currentDisplayName = null;

  els.identityPrompt.hidden = true;
  els.siwfStatus.hidden = true;
  els.siwfFallbackLink.hidden = true;
  els.identityAddress.hidden = false;
  els.identityAddress.textContent = `Signed in: ${currentAddress}`;
  els.siwfBtn.hidden = true;
  els.connectBtn.hidden = true;
  els.connectDivider.hidden = true;

  await loadStats(currentAddress, solAddresses);
}

async function connectWalletDirectly() {
  els.connectBtn.disabled = true;
  els.connectBtn.textContent = 'Connecting...';

  try {
    currentAddress = window.ethereum
      ? (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0]
      : null;

    if (!currentAddress) {
      throw new Error('No wallet found - install or open MetaMask, Coinbase Wallet, or similar.');
    }

    els.identityPrompt.hidden = true;
    els.identityAddress.hidden = false;
    els.identityAddress.textContent = `Connected: ${currentAddress}`;
    els.siwfBtn.hidden = true;
    els.connectBtn.hidden = true;
    els.connectDivider.hidden = true;

    await loadStats(currentAddress, null);
  } catch (err) {
    console.error(err);
    els.identityPrompt.textContent = `Could not connect: ${err.message}`;
    els.identityPrompt.hidden = false;
    els.connectBtn.disabled = false;
    els.connectBtn.textContent = 'Connect wallet directly';
  }
}

async function loadStats(address, knownSolAddresses) {
  const [respect, empire] = await Promise.all([
    fetchJSON(`/api/respect/${address}`),
    fetchJSON(`/api/empire/${address}`),
  ]);

  let solAddresses = knownSolAddresses;
  if (solAddresses === null) {
    const identity = await fetchJSON(`/api/identity/${address}`).catch(() => ({ solAddresses: [] }));
    solAddresses = identity.solAddresses || [];
    currentDisplayName = identity.username || currentDisplayName;
  }

  let wavewarz = { found: false, note: 'no verified Solana address found' };
  if (solAddresses.length) {
    const results = await Promise.all(
      solAddresses.map((solAddr) => fetchJSON(`/api/wavewarz/${solAddr}`).catch(() => ({ found: false })))
    );
    wavewarz = results.find((r) => r.found) || { found: false, note: 'no WaveWarZ match across verified Solana addresses' };
  }

  currentStats = { respect, empire, wavewarz };

  const totalRespect = (parseFloat(respect.ogRespect) || 0) + (parseFloat(respect.zorRespect) || 0);
  document.getElementById('stat-respect').textContent = totalRespect.toString();
  document.getElementById('stat-respect-detail').textContent =
    `OG ${respect.ogRespect} + ZOR ${respect.zorRespect}`;

  document.getElementById('stat-empire').textContent = empire.rank ?? 'unranked';
  document.getElementById('stat-empire-detail').textContent = empire.balance
    ? `${empire.balance} ZABAL`
    : 'ZABAL Empire';

  if (wavewarz.found && wavewarz.role === 'trader') {
    document.getElementById('stat-wavewarz').textContent = `${wavewarz.winRate}% win rate`;
    document.getElementById('stat-wavewarz-detail').textContent = `Trader - ${wavewarz.volumeSol} SOL volume, ${wavewarz.netPnlSol} SOL P&L`;
  } else if (wavewarz.found) {
    document.getElementById('stat-wavewarz').textContent = `${wavewarz.wins} wins`;
    document.getElementById('stat-wavewarz-detail').textContent = `Artist - ${wavewarz.volumeSol} SOL volume`;
  } else {
    document.getElementById('stat-wavewarz').textContent = 'no match';
    document.getElementById('stat-wavewarz-detail').textContent = wavewarz.note || 'check WaveWarZ wallet linkage';
  }

  document.getElementById('stats-grid').hidden = false;
  document.getElementById('attest-section').hidden = false;
}

// Tries three signing options in order:
// 1. The Farcaster Mini App's own wallet - only present when this page is
//    actually LAUNCHED as a Mini App inside Warpcast/Base App (not just
//    opened as a regular link, even inside their browser).
// 2. An injected wallet (MetaMask etc.) - when opened inside a wallet app's
//    own browser.
// 3. WalletConnect - any other plain browser, no extension needed.
async function getSigningProvider() {
  try {
    const hasHost = await Promise.race([
      sdk.actions.ready().then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 1200)),
    ]);
    if (hasHost && sdk.wallet?.ethProvider) {
      els.mintStatus.textContent = 'Using your Farcaster wallet...';
      return sdk.wallet.ethProvider;
    }
  } catch (err) {
    console.error('Farcaster wallet not available, trying next option', err);
  }

  if (window.ethereum) return window.ethereum;

  if (!wcProvider) {
    els.mintStatus.textContent = 'Loading wallet connector...';
    const { walletConnectProjectId } = await fetchJSON('/api/config');
    if (!walletConnectProjectId) {
      throw new Error('No wallet found, and WalletConnect is not configured.');
    }

    const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2');

    wcProvider = await EthereumProvider.init({
      projectId: walletConnectProjectId,
      chains: [8453],
      showQrModal: true,
      metadata: {
        name: 'ZAO Artist Value Ledger',
        description: 'Proof of your standing across The ZAO',
        url: window.location.origin,
        icons: [],
      },
    });
  }

  els.mintStatus.textContent = 'Scan the QR code or approve in your wallet app...';
  await wcProvider.enable();
  return wcProvider;
}

async function mintAttestation() {
  if (!currentStats || !currentAddress) return;

  els.mintBtn.disabled = true;
  els.mintStatus.textContent = 'Preparing attestation data...';

  try {
    const prepared = await fetchJSON('/api/eas/prepare', {
      method: 'POST',
      body: JSON.stringify({
        address: currentAddress,
        artist: currentAddress,
        ogRespect: currentStats.respect.ogRespect,
        zorRespect: currentStats.respect.zorRespect,
        empireRank: currentStats.empire.rank || 0,
        wavewarzWins: currentStats.wavewarz.wins || 0,
        wavewarzVolumeSol: currentStats.wavewarz.volumeSol || 0,
      }),
    });

    const provider = await getSigningProvider();
    els.mintStatus.textContent = 'Confirm in your wallet...';

    const walletClient = createWalletClient({ chain: base, transport: custom(provider) });
    const [account] = await walletClient.getAddresses();

    const txHash = await walletClient.writeContract({
      address: prepared.easContractAddress,
      abi: EAS_ABI,
      functionName: 'attest',
      account,
      args: [{
        schema: prepared.schemaUID,
        data: {
          recipient: prepared.recipient,
          expirationTime: 0n,
          revocable: true,
          refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
          data: prepared.encodedData,
          value: 0n,
        },
      }],
    });

    els.mintStatus.textContent = '';
    showProofCard(txHash, prepared.snapshotTimestamp);
  } catch (err) {
    console.error(err);
    els.mintStatus.textContent = `Could not mint: ${err.message}`;
  } finally {
    els.mintBtn.disabled = false;
  }
}

function showProofCard(txHash, snapshotTimestamp) {
  const s = currentStats;
  const totalRespect = (parseFloat(s.respect.ogRespect) || 0) + (parseFloat(s.respect.zorRespect) || 0);

  els.proofArtist.textContent = currentDisplayName ? `@${currentDisplayName}` : currentAddress;
  els.proofRespect.textContent = totalRespect.toString();
  els.proofEmpire.textContent = s.empire.rank ? `#${s.empire.rank}` : 'unranked';
  els.proofWavewarz.textContent = s.wavewarz.found
    ? `${s.wavewarz.wins} wins - ${s.wavewarz.volumeSol} SOL`
    : 'no record';

  const date = new Date(snapshotTimestamp * 1000);
  els.proofDate.textContent = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const explorerUrl = `https://base.easscan.org/attestation/tx/${txHash}`;
  els.proofLink.setAttribute('href', explorerUrl);
  els.proofUrlFallback.textContent = explorerUrl;
  els.proofLink.dataset.url = explorerUrl;

  document.getElementById('attest-section').hidden = true;
  els.proofCard.hidden = false;
}

async function shareProof() {
  const attestationUrl = els.proofLink.dataset.url;
  const appUrl = window.location.origin;
  const s = currentStats;
  const totalRespect = (parseFloat(s.respect.ogRespect) || 0) + (parseFloat(s.respect.zorRespect) || 0);
  const wavewarzLine = s.wavewarz.found
    ? `${s.wavewarz.wins} WaveWarZ wins, ${s.wavewarz.volumeSol} SOL volume`
    : (s.wavewarz.note || 'no WaveWarZ record yet');

  const text = `Verified my standing in The ZAO onchain:
Respect: ${totalRespect}
Empire Builder: ${s.empire.rank ? `#${s.empire.rank}` : 'unranked'}
${wavewarzLine}

Proof: ${attestationUrl}`;

  try {
    await sdk.actions.composeCast({ text, embeds: [appUrl] });
  } catch (err) {
    console.error('composeCast unavailable (not inside a Farcaster client), falling back', err);
    try {
      await navigator.clipboard.writeText(`${text} ${appUrl}`);
      els.shareBtn.textContent = 'Copied - paste into a cast';
    } catch (clipErr) {
      els.shareBtn.textContent = 'Copy failed - use link below';
    }
    setTimeout(() => { els.shareBtn.textContent = 'Share to Farcaster'; }, 3000);
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${url} failed`);
  }
  return res.json();
}
