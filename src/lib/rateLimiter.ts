class RateLimiter {
  private requests: { [key: string]: number[] } = {}
  private limits: { [key: string]: { limit: number, window: number } } = {
    default: { limit: 300, window: 60000 }, // 10 requests per minute
    track: { limit: 300, window: 60000 },   // 30 requests per minute
    generate: { limit: 300, window: 60000 } // 20 requests per minute
  }

  canMakeRequest(key: string, path: string): boolean {
    const now = Date.now()
    const config = this.limits[path] || this.limits.default
    
    if (!this.requests[key]) {
      this.requests[key] = [now]
      return true
    }

    // Remove timestamps outside the window
    this.requests[key] = this.requests[key].filter(
      timestamp => now - timestamp < config.window
    )

    if (this.requests[key].length < config.limit) {
      this.requests[key].push(now)
      return true
    }

    return false
  }
}

export const rateLimiter = new RateLimiter() 