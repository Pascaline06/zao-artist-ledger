import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
import { createWalletClient, custom } from 'https://esm.sh/viem@2';
import { base } from 'https://esm.sh/viem@2/chains';

const els = {
  connectBtn: document.getElementById('connect-btn'),
  identityCard: document.getElementById('identity-card'),
  identityPrompt: document.querySelector('.identity-prompt'),
  identityAddress: document.getElementById('identity-address'),
  statsGrid: document.getElementById('stats-grid'),
  attestSection: document.getElementById('attest-section'),
  mintBtn: document.getElementById('mint-btn'),
  mintStatus: document.getElementById('mint-status'),
};

let currentAddress = null;
let currentStats = null;

els.connectBtn.addEventListener('click', connectAndLoad);
els.mintBtn.addEventListener('click', mintAttestation);

async function connectAndLoad() {
  els.connectBtn.disabled = true;
  els.connectBtn.textContent = 'Connecting...';

  try {
    const farcasterReady = sdk.actions.ready().then(() => sdk.context);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
    const context = await Promise.race([farcasterReady, timeout]);

    currentAddress =
      context?.user?.verifiedAddresses?.ethAddresses?.[0] ||
      (window.ethereum ? (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0] : null);

    if (!currentAddress) {
      throw new Error('No wallet address available - open this inside Farcaster, or connect a browser wallet.');
    }

    els.identityPrompt.hidden = true;
    els.identityAddress.hidden = false;
    els.identityAddress.textContent = currentAddress;
    els.connectBtn.hidden = true;

    await loadStats(currentAddress);
  } catch (err) {
    console.error(err);
    els.identityPrompt.textContent = `Could not connect: ${err.message}`;
    els.identityPrompt.hidden = false;
    els.connectBtn.disabled = false;
    els.connectBtn.textContent = 'Connect wallet';
  }
}

async function loadStats(address) {
  const [respect, empire, wavewarz] = await Promise.all([
    fetchJSON(`/api/respect/${address}`),
    fetchJSON(`/api/empire/${address}`),
    fetchJSON(`/api/wavewarz/${address}`),
  ]);

  currentStats = { respect, empire, wavewarz };

  const totalRespect = BigInt(respect.ogRespect || 0) + BigInt(respect.zorRespect || 0);
  document.getElementById('stat-respect').textContent = totalRespect.toString();
  document.getElementById('stat-respect-detail').textContent =
    `OG ${respect.ogRespect} + ZOR ${respect.zorRespect}`;

  document.getElementById('stat-empire').textContent = empire.rank ?? 'unranked';
  document.getElementById('stat-empire-detail').textContent = empire.balance
    ? `${empire.balance} ZABAL`
    : 'ZABAL Empire';

  document.getElementById('stat-wavewarz').textContent = wavewarz.found
    ? `${wavewarz.wins} wins`
    : 'no wallet match';
  document.getElementById('stat-wavewarz-detail').textContent = wavewarz.found
    ? `${wavewarz.volumeSol} SOL volume`
    : 'check WaveWarZ wallet linkage';

  els.statsGrid.hidden = false;
  els.attestSection.hidden = false;
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

    els.mintStatus.textContent = 'Confirm in your wallet...';

    const walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
    });
    void walletClient;

    els.mintStatus.textContent =
      'Attestation prepared - wallet signing flow needs to be completed and tested live before this button actually mints.';
  } catch (err) {
    console.error(err);
    els.mintStatus.textContent = `Could not mint: ${err.message}`;
  } finally {
    els.mintBtn.disabled = false;
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${url} failed`);
  }
  return res.json();
}
