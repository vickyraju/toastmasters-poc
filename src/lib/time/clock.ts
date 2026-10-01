// The only clock features may read. The mock adapter registers a source; real time otherwise.
let source: () => number = () => Date.now();

export function setClockSource(fn: () => number): void {
  source = fn;
}

export function now(): Date {
  return new Date(source());
}
