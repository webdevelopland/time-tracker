export class Timer {
  startMs: number;
  savedMs: number = 0;

  start(): void {
    this.startMs = Date.now();
  }

  display(): number {
    if (this.startMs) {
      return this.savedMs + Date.now() - this.startMs;
    } else {
      return this.savedMs;
    }
  }

  stop(): void {
    this.savedMs = this.display();
    this.startMs = 0;
  }

  destroy(): void {
    this.startMs = undefined;
    this.savedMs = 0;
  }
}
