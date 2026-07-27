export class GenerationSourceChangedError extends Error {
  constructor() {
    super('Generation source changed while the AI was responding.');
    this.name = 'GenerationSourceChangedError';
  }
}
