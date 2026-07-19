export const SCHEMA_STRING =
  'string artist,uint256 ogRespect,uint256 zorRespect,uint256 empireRank,uint256 wavewarzWins,uint256 wavewarzVolumeSol,uint256 snapshotTimestamp';

// Lazy-loaded: the EAS SDK's lodash import doesn't resolve cleanly under plain
// Node ESM here, so we only pull it in when this function actually runs,
// not at server startup.
export async function encodeAttestationData({
  artist,
  ogRespect,
  zorRespect,
  empireRank,
  wavewarzWins,
  wavewarzVolumeSol,
  snapshotTimestamp,
}) {
  const { SchemaEncoder } = await import('@ethereum-attestation-service/eas-sdk');
  const encoder = new SchemaEncoder(SCHEMA_STRING);
  return encoder.encodeData([
    { name: 'artist', value: artist, type: 'string' },
    { name: 'ogRespect', value: BigInt(ogRespect), type: 'uint256' },
    { name: 'zorRespect', value: BigInt(zorRespect), type: 'uint256' },
    { name: 'empireRank', value: BigInt(empireRank ?? 0), type: 'uint256' },
    { name: 'wavewarzWins', value: BigInt(wavewarzWins ?? 0), type: 'uint256' },
    { name: 'wavewarzVolumeSol', value: BigInt(Math.round((wavewarzVolumeSol ?? 0) * 1e6)), type: 'uint256' },
    { name: 'snapshotTimestamp', value: BigInt(snapshotTimestamp), type: 'uint256' },
  ]);
}
