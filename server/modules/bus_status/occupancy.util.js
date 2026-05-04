/**
 * Maps passenger count vs bus capacity to the same bands used in seed data.
 * @param {number} occupancyCount
 * @param {number} capacity
 * @returns {"empty"|"few seats"|"standing room"|"full"}
 */
export function getOccupancyStatus(occupancyCount, capacity) {
  const count = Number(occupancyCount) || 0;
  const cap = Number(capacity) || 0;
  const ratio = cap > 0 ? count / cap : 0;
  if (ratio >= 1) return "full";
  if (ratio >= 0.7) return "standing room";
  if (ratio >= 0.3) return "few seats";
  return "empty";
}
