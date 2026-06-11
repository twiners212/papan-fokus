export function getMidPosition(prev?: number, next?: number): number {
  if (prev !== undefined && next !== undefined) {
    return (prev + next) / 2;
  }
  if (prev !== undefined) {
    return prev + 1000;
  }
  if (next !== undefined) {
    return next / 2;
  }
  // Default first position
  return 1000;
}
