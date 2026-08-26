export interface Chunk {
  id: number;
  source: string;
  text: string;
}

export interface Index {
  chunks: Chunk[];
  embeddings: number[][];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}