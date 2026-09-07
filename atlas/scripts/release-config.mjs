import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function readReleaseConfig(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'data/release-config.json'), 'utf8'));
  if (config.schemaVersion !== 1 || !/^V\d+$/.test(config.version) || config.audience !== 'owner-only') {
    throw new Error('Invalid release identity or audience');
  }
  const names = [...config.appointmentReviewBatches,
    ...config.appointmentSupplementBatches.flatMap(row => [row.evidence, row.decisions])];
  if (!config.appointmentReviewBatches.length || new Set(names).size !== names.length ||
      names.some(name => typeof name !== 'string' || !/^v\d+-[a-z-]+\.json$/.test(name))) {
    throw new Error('Invalid or duplicate approved review batch');
  }
  for (const name of names) if (!fs.existsSync(path.join(root, 'data', name))) {
    throw new Error(`Approved review batch missing: ${name}`);
  }
  return config;
}

export function loadSupplementBatches(root) {
  return readReleaseConfig(root).appointmentSupplementBatches.map(batch => ({
    evidence: JSON.parse(fs.readFileSync(path.join(root, 'data', batch.evidence), 'utf8')),
    decisions: JSON.parse(fs.readFileSync(path.join(root, 'data', batch.decisions), 'utf8'))
  }));
}

export function loadSupplementDecisions(root) {
  return { records: loadSupplementBatches(root).flatMap(batch => batch.decisions.records) };
}
