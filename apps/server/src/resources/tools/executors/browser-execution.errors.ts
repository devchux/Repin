export class BrowserSessionUnavailableError extends Error {
  constructor(message = 'Browser session is unavailable') {
    super(message);
    this.name = 'BrowserSessionUnavailableError';
  }
}

export class BrowserCommandOutcomeUnknownError extends Error {
  constructor(message = 'Browser command outcome is unknown') {
    super(message);
    this.name = 'BrowserCommandOutcomeUnknownError';
  }
}
