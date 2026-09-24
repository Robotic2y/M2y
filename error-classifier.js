export function classifyError(error = {}) {
  const code = error.code || error.name || 'UNKNOWN_ERROR';
  if (['TASK_TIMEOUT', 'EXTERNAL_SEARCH_TIMEOUT', 'NETWORK_ERROR', 'ETIMEDOUT'].includes(code)) return 'retryable';
  if (['INVALID_EXECUTION_STATE', 'NO_ACTIVE_EXECUTION', 'QUEUE_BACKPRESSURE', 'CIRCUIT_OPEN'].includes(code)) return 'recoverable';
  if (['BACKUP_VALIDATION_FAILED', 'TASK_CANCELLED', 'QUEUE_STOPPED'].includes(code)) return 'user_action_required';
  if (['MANIFEST_INVALID', 'STORAGE_CORRUPTED', 'FATAL_EXTRACTION_ERROR'].includes(code)) return 'fatal';
  return error.classification || 'recoverable';
}
export function describeError(error, context = {}) { return { classification: classifyError(error), code: error?.code || error?.name || 'UNKNOWN_ERROR', message: error?.message || 'Falha sem mensagem', context }; }
export default { classifyError, describeError };
