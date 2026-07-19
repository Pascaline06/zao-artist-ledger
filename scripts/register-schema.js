// Run once: node scripts/register-schema.js
import { ethers } from 'ethers';
import { createRequire } from 'module';
import 'dotenv/config';
import { SCHEMA_STRING } from '../server/lib/easSchema.js';

// Loading via createRequire (CommonJS) rather than ESM import - the EAS
// SDK's ESM build has a broken named-import from lodash in this environment.
// Its CommonJS build doesn't have this problem.
const require = createRequire(import.meta.url);
const { SchemaRegistry } = require('@ethereum-attestation-service/eas-sdk');

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
    resolverAddress: ethers.ZeroAddress,
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
