export const PERSONALITIES = ["Warm", "Curious", "Playful", "Calm", "Direct"] as const;

export type Personality = (typeof PERSONALITIES)[number];