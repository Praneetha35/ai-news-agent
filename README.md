# AI News Agent: From Headlines to Your Inbox (and LinkedIn)

*How I built a pipeline that turns the day’s AI news into a personal digest and ready-to-post content — built for content creators who want to show up daily without the grind.*

---

## The problem

AI moves fast. New models, policy shifts, and “everyone’s talking about this” moments show up every day. Keeping up means either drowning in tabs and feeds or missing the signal in the noise.

I wanted something that could **fetch** what’s trending, **curate** what actually matters, **skim** the articles so I didn’t have to read every word, and then **write** in my voice — for a quick WhatsApp read and for LinkedIn posts I could hit “post” on without rewriting.

So I built an **AI News Agent**: a single pipeline that does all of that in one run.

---

## Goal and purpose

**Goal:** Turn “everything published about AI today” into a small set of outputs that feel personal and actionable:

1. **A WhatsApp digest** — Short, scannable, numbered. One line per story, why it matters, and a link. The kind of thing you read in 60 seconds.
2. **Two LinkedIn posts** — Written in a reflective, builder-oriented voice, with real specifics (names, numbers, implications). Ready to tweak and post, not generic summaries.
3. **Persistent output** — Each run saves a JSON snapshot (curated list, skimmed content, final copy) so you can reuse or audit later.

**Purpose:** Save time and keep a consistent “voice” across digest and social. The agent does the gathering and first draft; you do the final read and the click.

**For content creators:** If you’re trying to post daily — on LinkedIn, a newsletter, or elsewhere — this pipeline gives you a steady supply of on-topic, in-your-voice drafts. Run it once a day (or on a schedule), and you get a digest plus two LinkedIn-ready posts without staring at a blank screen. It’s built for people who want to show up consistently without burning out on research and first drafts.

---

## The pipeline

The agent is a **LangGraph** state machine: one entry point, a fixed sequence of steps, and shared state between them.

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌─────────┐
│  fetch  │───▶│ curate  │───▶│  skim   │───▶│  write  │───▶│ send_whatsapp │───▶│  save   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └──────────────┘    └─────────┘
     │               │              │              │                    │               │
  News API       LLM pick       Jina + LLM     GPT-4 narrative     WhatsApp Cloud    output/
  (raw articles)  top 5         key points     digest + 2 posts        API           digest-*.json
```

**Flow in one sentence:** Fetch articles → curate top 5 → skim each for key points → write WhatsApp digest + 2 LinkedIn posts → send to WhatsApp → save to disk.

**Where it lands today:** At the end of the pipeline, the digest (and LinkedIn-style posts) are sent to **WhatsApp** — that’s the delivery target for now. You get the same content in the console and in `output/digest-*.json`, but the main “delivery” is your WhatsApp. Later you can add LinkedIn drafts, email, or other channels.

Each step reads from and writes into a shared **DigestState** (niche, writing style, articles, curated list, skimmed items, whatsappText, linkedinPosts, runId, errors). No separate services or queues — one process, one graph, one run.

---

## How each step works

### 1. Fetch

**Node:** `fetchNewsNode`  
**Tool:** NewsAPI (`newsapi.org`).

- Builds a query from your **niche** (default: `"AI news"`), e.g.  
  `(AI OR "artificial intelligence" OR LLM OR "AI agent" OR "multi-agent") AND (AI news)`.
- Calls NewsAPI with that query, English, sorted by `publishedAt`, up to 30 articles.
- Returns **raw articles** (title, url, source, publishedAt, description) into state.

**You need:** `NEWS_API_KEY` in `.env`.

---

### 2. Curate

**Node:** `curateNewsNode`  
**Model:** GPT-4.1-mini (low temperature for consistency).

- Takes the raw list and asks the LLM to pick the **top 5** “talk of the town” items.
- Instructions focus on: big releases (OpenAI, Anthropic, Google, Meta, Apple, NVIDIA, Microsoft), new models, benchmarks, multi-agent systems, viral or industry-shifting news — and to avoid fluff, duplicates, and generic opinion.
- For each chosen item the model returns: title, url, source, publishedAt, **why_it_matters** (one sentence), and a **score** (0–100).
- Results are sorted by score and stored as **curated** in state.

This step is what turns “30 articles” into “the 5 that actually matter today.”

---

### 3. Skim

**Node:** `skimArticlesNode`  
**Tools:** Jina Reader (r.jina.ai) + GPT-4.1-mini.

- For each curated article, **Jina** fetches the page and returns markdown (capped at 6000 chars). No paywall handling; if content is too short or missing, we fall back to the curator’s “why it matters.”
- The LLM then turns the article into **7–10 bullet “builder notes”**: concrete (numbers, names, products, policy), implication-focused (“what this signals,” “what changes for builders”), in a reflective, slightly witty voice. Explicit instruction: do **not** copy or paraphrase the article; extract ideas and rephrase.
- Output is **skimmedArticles**: title, url, **keyPoints** (the bullet block). This is the main input for the writer so the digest and LinkedIn posts stay specific and in your style.

---

### 4. Write

**Node:** `writeDigestNode`  
**Model:** GPT-4.1 (higher temperature for more natural prose).

- Uses **skimmedArticles** (or curated fallback), your **writingStyle**, and the current **date**.
- Asks for two things in one response:
  - **A) WhatsApp digest:** Scannable, numbered 1–5, one-line headline + one-line “why” + link per item, with a short date header.
  - **B) Two LinkedIn posts:** Different angles, 7–10 lines each, 1–2 links, concrete details, conversational. No hashtag spam.
- The model returns a single text block with delimiters: `===WHATSAPP===`, `===LINKEDIN_POST_1===`, `===LINKEDIN_POST_2===`. We parse these and write **whatsappText** and **linkedinPosts** into state. If the WhatsApp block is missing or too short, we fall back to a simple formatted list from **curated**.

---

### 5. Send (WhatsApp)

**Node:** `sendWhatsAppNode`  
**Tool:** WhatsApp Cloud API (Graph API).

- Builds **textToSend**: if there are LinkedIn posts, it sends those (joined with `---`); otherwise it sends **whatsappText**.
- If there’s nothing to send, it logs a warning and returns without calling the API.
- Otherwise it calls **sendWhatsAppText** (Bearer token, phone number ID, recipient from env). The API expects digits only (country code + number).
- Success: you see “Request accepted” and a message ID in the console. **Delivery** on the phone still depends on WhatsApp’s rules (e.g. 24-hour window or approved template for first contact).

**You need:** `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TO_PHONE` in `.env`.

---

### 6. Save

**Node:** `saveOutputNode`

- Creates `output/` if needed and writes **digest-{runId}.json** with runId, niche, writingStyle, curated, skimmedArticles, whatsappText, linkedinPosts, and errors. So every run is traceable and reusable.

---

## What you can do with it (other use cases)

- **Different niches** — Set `DIGEST_NICHE` (e.g. `"climate tech"`, `"developer tools"`) and optionally adjust the fetch query in code. Same pipeline, different topic.
- **Your voice everywhere** — Set `WRITING_STYLE` (e.g. “direct, practical, slightly witty, no corporate tone”). The writer and skimmer both use it so WhatsApp and LinkedIn stay on-brand.
- **Console-only runs** — Omit WhatsApp env vars if you don’t want to send. The pipeline will throw at **send_whatsapp** when it tries to send; to make it optional you could add a “if no WhatsApp config, skip send” branch and still get digest + LinkedIn in console and in **output/**.
- **LinkedIn-first** — The send step currently prefers **linkedinPosts** over whatsappText when both exist. So you can treat the run as “generate two LinkedIn posts and also send them to me on WhatsApp.”
- **Daily content creators** — Run the agent once a day (manually or via cron). You get a fresh digest and two LinkedIn posts every time, so you always have something to review and post. No more “what do I write about today?”
- **Scheduled digest** — Use the built-in scheduler: `npm run schedule` runs the pipeline once on startup and then every day at **8:00 AM** (or set `SCHEDULE_CRON` for a custom time). No system cron needed.
- **Repurposing** — Use **output/digest-*.json** to drive a simple site, newsletter, or Slack bot: the structured curated + skimmed + final copy is already there.

---

## What’s next (future ideas)

The pipeline today ends at **save** (and optionally WhatsApp). Down the road, automation could go further:

- **LinkedIn draft posts** — Push the two generated posts into your LinkedIn draft queue via API or integration, so they’re waiting in the app for you to review and hit “Post.”
- **More channels** — Same digest and posts could be sent to Twitter/X, a newsletter (e.g. Substack), Notion, or a custom CMS. The output is already structured; adding nodes or scripts to post elsewhere is the next step.
- **Full automation** — Schedule the run, auto-save to drafts or a content calendar, and optionally auto-publish at a set time once you’re comfortable with the quality.

If you’re building in that direction, the current graph and `output/digest-*.json` are a good base to plug into LinkedIn’s API, Zapier, or your own automation layer.

---

## Quick start

**Requirements:** Node (with ES modules), and API keys as below.

1. **Clone and install**
   ```bash
   cd ai-news-agent/src
   npm install
   ```

2. **Environment**
   Create a `.env` in `src/` with at least:
   - `NEWS_API_KEY` — [newsapi.org](https://newsapi.org)
   - `OPENAI_API_KEY` — for curate, skim, and write
   - Optional for WhatsApp: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TO_PHONE`

   Optional tuning:
   - `DIGEST_NICHE` — default `"AI news"`
   - `WRITING_STYLE` — default `"direct, practical, slightly witty, no corporate tone, short punchy lines"`

3. **Run**
   ```bash
   npm run dev
   # or: npm start
   ```
   You’ll see the WhatsApp digest and two LinkedIn posts in the console, and a file under `output/digest-{runId}.json`. If WhatsApp is configured, the send step will run after write.

4. **Run on a schedule (e.g. 8 AM every morning)**
   ```bash
   npm run schedule
   ```
   The process runs the digest **once immediately**, then again every day at **8:00 AM** (in your machine’s local time). Leave it running in the background (or in a terminal/screen/tmux); it will keep firing at the same time each day.

   To change the time, set `SCHEDULE_CRON` in `.env` using a 5-field cron expression:
   - `0 8 * * *` — 8:00 AM every day (default)
   - `0 7 * * 1-5` — 7:00 AM on weekdays
   - `30 6 * * *` — 6:30 AM every day

   Format: `minute hour day-of-month month day-of-week`. Press Ctrl+C to stop the scheduler.

---

## Conclusion

The AI News Agent is a single pipeline: **fetch → curate → skim → write → send → save**. At the end, it goes into **WhatsApp** — that’s the thing for now. It doesn’t try to replace your judgment; it narrows the firehose to a few stories, pulls out the builder-relevant bits, and drafts in your voice so you can read the digest in 60 seconds on your phone (or use the saved JSON and LinkedIn drafts however you like).

If you’re the kind of person who wants “today’s AI news” as a short digest and two LinkedIn posts — or you’re a content creator aiming to post daily without the grind — this is the structure that gets you there. Swap the niche, tweak the style, add a cron job or a second output channel; later, plug in LinkedIn drafts or other platforms and you’ve got a pattern that scales beyond this one repo.

---

*Built with [LangGraph](https://github.com/langchain-ai/langgraph), [NewsAPI](https://newsapi.org), [Jina Reader](https://jina.ai/reader), OpenAI, and the WhatsApp Cloud API.*
