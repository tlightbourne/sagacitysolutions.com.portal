/**
 * Hashes a string to a stable number.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export interface TaskColorTheme {
  primary: string;       // Main accent color
  background: string;    // Soft background tint
  border: string;        // Soft matching border
  text: string;          // Dark readable matching text
  textLight: string;     // Bright matching text for dark mode readability
}

/**
 * Generates a stable HSL color theme based on a string identifier (e.g. task ID).
 * This ensures that a top-level task and all of its subtask descendants share 
 * a consistent and highly distinct theme accent.
 */
export function getTaskColorTheme(id: string): TaskColorTheme {
  const hash = hashString(id || "default");
  
  // Distribute hues across 360 degrees, but shift slightly to avoid raw muddy colors
  const hue = hash % 360;
  
  return {
    primary: `hsl(${hue}, 65%, 42%)`,
    background: `hsl(${hue}, 25%, 97%)`,
    border: `hsl(${hue}, 35%, 89%)`,
    text: `hsl(${hue}, 70%, 20%)`,
    textLight: `hsl(${hue}, 90%, 82%)`, // Bright, beautifully readable pastel color!
  };
}
