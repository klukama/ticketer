export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString()
  if (error instanceof Error) {
    console.error(`[${timestamp}] ${context}: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
  } else {
    console.error(`[${timestamp}] ${context}:`, error)
  }
}
