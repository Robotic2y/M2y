const text = value => String(value ?? '').trim();
const strip = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function normalizePhone(value) { const raw = text(value); const digits = raw.replace(/\D/g, ''); return digits ? (digits.startsWith('55') ? digits : `55${digits}`) : ''; }
export function normalizeName(value) { return strip(value).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); }
export function normalizeAddress(value) { return strip(value).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
export function normalizeUrl(value) {
  const raw = text(value); if (!raw || raw === 'N/A') return '';
  try { const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(key => url.searchParams.delete(key)); url.hash = ''; return url.toString().replace(/\/$/, '').toLowerCase(); } catch (_) { return raw.toLowerCase(); }
}
export function domainOf(value) { try { return new URL(normalizeUrl(value)).hostname.replace(/^www\./, ''); } catch (_) { return ''; } }
export function completeness(lead = {}) {
  const fields = ['name','category_main','address','city','state','phone','website','hours','rating_value','screenshot'];
  const filled = fields.filter(key => lead[key] !== undefined && lead[key] !== null && String(lead[key]).trim() !== '' && lead[key] !== 'N/A').length;
  const score = Math.round(filled / fields.length * 100);
  return { score, classification: score >= 90 ? 'Completo' : score >= 70 ? 'Quase completo' : score >= 40 ? 'Parcial' : 'Insuficiente', filled, total: fields.length };
}
export function suspiciousFields(lead = {}) {
  const issues = [];
  if (lead.phone && lead.phone !== 'N/A' && normalizePhone(lead.phone).replace(/^55/, '').length < 10) issues.push({ field: 'phone', code: 'INVALID_PHONE' });
  if (lead.website && lead.website !== 'N/A' && !domainOf(lead.website)) issues.push({ field: 'website', code: 'INVALID_URL' });
  if (lead.cep && lead.cep !== 'N/A' && !/^\d{5}-?\d{3}$/.test(String(lead.cep))) issues.push({ field: 'cep', code: 'INVALID_CEP' });
  if (lead.city && lead.state && String(lead.city).length < 2) issues.push({ field: 'address', code: 'INCONSISTENT_ADDRESS' });
  return issues;
}
export function confidence(lead = {}) {
  const c = completeness(lead); const issues = suspiciousFields(lead); return Math.max(0, Math.round(c.score - issues.length * 12));
}
export function enrichLead(lead = {}) {
  const next = { ...lead };
  if (lead.phone && lead.phone !== 'N/A') { next.phoneRaw = lead.phone; next.phoneNormalized = normalizePhone(lead.phone); }
  if (lead.website && lead.website !== 'N/A') { next.websiteRaw = lead.website; next.websiteNormalized = normalizeUrl(lead.website); next.website_domain = domainOf(lead.website); }
  if (lead.name && lead.name !== 'N/A') next.nameNormalized = normalizeName(lead.name);
  if (lead.address && lead.address !== 'N/A') next.addressNormalized = normalizeAddress(lead.address);
  next.completeness = completeness(next); next.completeness_score = next.completeness.score; next.suspect_fields = suspiciousFields(next); next.data_confidence_score = confidence(next);
  next.data_sources = { ...(lead.data_sources || {}), name: 'Google Maps', address: 'Google Maps', phone: 'Google Maps', website: 'Google Maps' };
  next.quality_status = next.suspect_fields.length ? 'conflitante' : next.data_confidence_score >= 80 ? 'confirmado' : next.data_confidence_score >= 50 ? 'provável' : 'desconhecido';
  return next;
}
export function mergeByPrecedence(oldLead = {}, incoming = {}, source = 'enrichment') {
  const result = { ...oldLead }; const changes = [];
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null || value === '' || value === 'N/A') continue;
    const oldValue = result[key]; if (oldValue && oldValue !== 'N/A' && oldValue !== value) { changes.push({ field: key, oldValue, newValue: value, source, at: new Date().toISOString() }); continue; }
    result[key] = value;
  }
  if (changes.length) result.conflicts = [...(oldLead.conflicts || []), ...changes];
  result.change_history = [...(oldLead.change_history || []), ...changes];
  return enrichLead(result);
}
export default { normalizePhone, normalizeName, normalizeAddress, normalizeUrl, domainOf, completeness, suspiciousFields, confidence, enrichLead, mergeByPrecedence };
