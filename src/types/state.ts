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

export type SkimmedItem = {
  title: string;
  url: string;
  keyPoints: string;
};

export type DigestState = {
  // inputs
  niche: string;
  writingStyle: string;

  // data
  articles: RawArticle[];
  curated: CuratedItem[];
  skimmedArticles: SkimmedItem[];

  // outputs
  whatsappText: string;
  linkedinPosts: string[]; 

  // debug/metadata
  runId: string;
  errors: string[];
};