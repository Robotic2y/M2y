const INTERNAL_KEYS = new Set(['m2y_backup_manifest', 'm2y_backup_blocks', 'm2y_backup_history', 'm2y_restore_lock']);
const api = () => globalThis.chrome?.storage?.local;
const all = async () => { const storage = api(); return storage ? storage.get(null) : {}; };
const digest = async value => { const bytes = new TextEncoder().encode(JSON.stringify(value)); if (!globalThis.crypto?.subtle) return String(bytes.length) + ':' + String(value).slice(0, 64); const hash = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join(''); };
const sourceData = async () => { const data = await all(); return Object.fromEntries(Object.entries(data).filter(([key]) => !INTERNAL_KEYS.has(key) && !key.startsWith('_test_'))); };
export async function createIncrementalBackup(reason = 'automatic') {
  const data = await sourceData(); const current = (await all()).m2y_backup_manifest || { schemaVersion: 1, hashes: {}, createdAt: null, updatedAt: null, count: 0 }; const blocks = (await all()).m2y_backup_blocks || {};
  const hashes = {}; const changed = {}; let unchanged = 0;
  for (const [key, value] of Object.entries(data)) { const hash = await digest(value); hashes[key] = hash; if (current.hashes?.[key] === hash && blocks[key] !== undefined) unchanged++; else changed[key] = value; }
  const mergedBlocks = { ...blocks, ...changed }; Object.keys(mergedBlocks).forEach(key => { if (!(key in data)) delete mergedBlocks[key]; });
  const manifest = { schemaVersion: 1, backupId: `bkp_${Date.now()}`, reason, createdAt: current.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), hashes, changedKeys: Object.keys(changed), unchangedKeys: Object.keys(data).filter(key => !Object.prototype.hasOwnProperty.call(changed, key)), count: Object.keys(data).length };
  if (api()) await api().set({ m2y_backup_manifest: manifest, m2y_backup_blocks: mergedBlocks, m2y_backup_history: [...((await all()).m2y_backup_history || []).slice(-9), { ...manifest, changedCount: Object.keys(changed).length, unchangedCount: unchanged }] });
  return { manifest, changedCount: Object.keys(changed).length, unchangedCount: unchanged };
}
export async function exportBackup() { const data = await all(); const snapshot = { format: 'M2Y_BACKUP', version: 1, exportedAt: new Date().toISOString(), manifest: data.m2y_backup_manifest || null, data: await sourceData() }; return JSON.stringify(snapshot); }
export function validateBackup(payload) {
  if (!payload || payload.format !== 'M2Y_BACKUP' || payload.version !== 1 || !payload.data || typeof payload.data !== 'object') return { valid: false, errors: ['INVALID_FORMAT'] };
  const errors = []; for (const [key, value] of Object.entries(payload.data)) { if (key.startsWith('__') || INTERNAL_KEYS.has(key)) errors.push(`FORBIDDEN_KEY:${key}`); if (key.startsWith('leads_') && !Array.isArray(value)) errors.push(`INVALID_LEADS:${key}`); }
  return { valid: errors.length === 0, errors, keys: Object.keys(payload.data).length };
}
export async function restoreBackup(payload) {
  const validation = validateBackup(payload); if (!validation.valid) throw Object.assign(new Error('BACKUP_VALIDATION_FAILED'), { code: 'BACKUP_VALIDATION_FAILED', validation });
  const rollback = JSON.parse(await exportBackup()); await createIncrementalBackup('pre_restore_rollback');
  if (api()) { await api().set({ m2y_restore_lock: { at: new Date().toISOString(), validation } }); await api().set(payload.data); await api().remove('m2y_restore_lock'); }
  return { restored: validation.keys, rollback };
}
export async function diagnoseStorage() {
  const data = await all(); let bytes = 0; let leads = 0; let executions = 0; let cache = 0; let screenshots = 0; const errors = [];
  for (const [key, value] of Object.entries(data)) { bytes += JSON.stringify(value).length; if (key.startsWith('leads_')) { executions++; if (Array.isArray(value)) { leads += value.length; value.forEach(lead => { if (!lead || !lead.name) errors.push({ key, code: 'INCOMPLETE_LEAD' }); }); } else errors.push({ key, code: 'INVALID_LEADS' }); } if (key.startsWith('m2y_cache_')) cache++; }
  screenshots = Object.keys(data.m2y_screenshot_hash_index || {}).length;
  return { bytes, storageUsed: `${(bytes / 1024).toFixed(1)} KB`, leads, executions, cache, screenshots, errors, keyCount: Object.keys(data).length, schemaVersion: data.m2y_schema_version || 1 };
}
export default { createIncrementalBackup, exportBackup, validateBackup, restoreBackup, diagnoseStorage };
