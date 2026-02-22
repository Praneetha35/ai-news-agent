export type RawArticle = {
  title: string;
  url: string;
  source?: { name?: string };
  publishedAt?: string;
  description?: string;
};

export type CuratedItem = {
  title: string;
  url: string;
  source: string;
  publishedAt?: string | null;
  why_it_matters: string;
  score: number; // 0-100
};

export type DigestState = {
  // inputs
  niche: string;
  writingStyle: string;

  // data
  articles: RawArticle[];
  curated: CuratedItem[];

  // outputs
  whatsappText: string;
  linkedinDraft: string;

  // debug/metadata
  runId: string;
  errors: string[];
};