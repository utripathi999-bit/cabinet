export interface Source {
  title: string;
  url: string;
  channel: string;
}

export interface TopicRecord {
  date: string; // YYYY-MM-DD, in IST
  callNumber: string; // e.g. "PHI-0042"
  category: string; // e.g. "Philosophy"
  title: string; // the topic itself, e.g. "The Ship of Theseus"
  description: string; // one paragraph, simple and interesting
  sources: Source[];
  cardNumber: number; // all-time incrementing count
  generatedAt: string; // ISO timestamp
}

// Raw shape we ask the model to return before we attach sources/card metadata.
export interface GeneratedTopicDraft {
  title: string;
  category: string;
  description: string;
  searchQuery: string;
}

// What we remember about a past topic for duplicate detection: enough to
// show the model an "avoid" list (title + category) and enough to check
// semantic similarity against new drafts (embedding).
export interface RecentTopic {
  title: string;
  category: string;
  embedding: number[];
}
