/**
 * Calculates the Erlang B blocking probability.
 * B(C, A) = (A^C / C!) / (Sum_{i=0}^C A^i / i!)
 * 
 * To avoid overflow with large factorials, we use a recursive approach:
 * B(c, A) = (A * B(c-1, A)) / (c + A * B(c-1, A))
 * where B(0, A) = 1
 * 
 * @param c Number of channels
 * @param a Traffic load in Erlangs (lambda / mu)
 */
export function calculateErlangB(c: number, a: number): number {
  if (a === 0) return 0;
  let b = 1;
  for (let i = 1; i <= c; i++) {
    b = (a * b) / (i + a * b);
  }
  return b;
}

/**
 * Calculates the probability of being in state n for a M/M/C/C system.
 * Pn = (A^n / n!) * P0
 * where P0 = 1 / (Sum_{i=0}^C A^i / i!)
 */
export function calculateStateProbabilities(c: number, a: number): number[] {
  const probs: number[] = new Array(c + 1).fill(0);
  let sum = 0;
  let current = 1; // A^0 / 0!
  
  probs[0] = current;
  sum += current;
  
  for (let i = 1; i <= c; i++) {
    current = (current * a) / i;
    probs[i] = current;
    sum += current;
  }
  
  // Normalize
  return probs.map(p => p / sum);
}
