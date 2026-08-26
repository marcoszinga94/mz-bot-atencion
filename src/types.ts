export interface Chunk {
  id: number;
  source: string;
  text: string;
}

export interface KnowledgeEntry {
  id: string;
  source: string;
  text: string;
  embedding: number[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}