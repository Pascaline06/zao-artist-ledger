// Run once: node scripts/register-schema.js
// Registers SCHEMA_STRING (server/lib/easSchema.js) on Base's SchemaRegistry
// and prints the schemaUID. Paste that into .env as EAS_SCHEMA_UID - every
// attestation this app writes afterward references that one schema.
//
// Needs EAS_SIGNER_PRIVATE_KEY set to a funded Base wallet (gas only, a few cents).
// This is the ONE step that needs a private key in this repo - registering the
// schema is a one-time admin action, separate from artists signing their own
// attestations later (see server/routes/eas.js).

import { EAS, SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';
import 'dotenv/config';
import { SCHEMA_STRING } from '../server/lib/easSchema.js';

const SCHEMA_REGISTRY_BASE = '0x4200000000000000000000000000000000000020';

async function main() {
  if (!process.env.EAS_SIGNER_PRIVATE_KEY) {
    throw new Error('Set EAS_SIGNER_PRIVATE_KEY in .env before running this script.');
  }

  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org');
  const signer = new ethers.Wallet(process.env.EAS_SIGNER_PRIVATE_KEY, provider);

  const registry = new SchemaRegistry(SCHEMA_REGISTRY_BASE);
  registry.connect(signer);

  console.log('Registering schema:', SCHEMA_STRING);

  const tx = await registry.register({
    schema: SCHEMA_STRING,
    resolverAddress: ethers.ZeroAddress, // no resolver contract - keep it simple for v1
    revocable: true,
  });

  const schemaUID = await tx.wait();
  console.log('Schema registered. UID:', schemaUID);
  console.log('Add this to .env as EAS_SCHEMA_UID');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
