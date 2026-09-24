export class CircuitBreaker {
  constructor({ failureThreshold = 5, resetTimeout = 30000 } = {}) { this.failureThreshold = failureThreshold; this.resetTimeout = resetTimeout; this.failures = 0; this.state = 'closed'; this.openedAt = 0; }
  canRun() { if (this.state !== 'open') return true; if (Date.now() - this.openedAt >= this.resetTimeout) { this.state = 'half-open'; return true; } return false; }
  success() { this.failures = 0; this.state = 'closed'; }
  failure() { this.failures++; if (this.failures >= this.failureThreshold) { this.state = 'open'; this.openedAt = Date.now(); } }
  async execute(operation) { if (!this.canRun()) throw Object.assign(new Error('CIRCUIT_OPEN'), { code: 'CIRCUIT_OPEN', classification: 'recoverable' }); try { const result = await operation(); this.success(); return result; } catch (error) { this.failure(); throw error; } }
  status() { return { state: this.state, failures: this.failures, openedAt: this.openedAt }; }
}
export default CircuitBreaker;
