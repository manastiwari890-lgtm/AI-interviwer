require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
const MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS || 1200);

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    '[warning] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key before starting real interviews.'
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// The interviewer's behavior lives in a plain markdown file so it's easy to
// tweak without touching any code. See prompts/system-prompt.md.
const BASE_SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, 'prompts', 'system-prompt.md'),
  'utf8'
);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Turns the setup-form answers into a short config block that gets appended
// to the base system prompt, so the model has the interview parameters
// pinned down before the conversation starts.
function buildSystemPrompt(config) {
  if (!config) return BASE_SYSTEM_PROMPT;

  const lines = [
    'CONFIRMED INTERVIEW CONFIGURATION (do not ask for these again):',
    `- Target role: ${config.role || 'Not specified'}`,
    `- Experience level: ${config.experienceLevel || 'Not specified'}`,
    `- Interview type: ${config.interviewType || 'Not specified'}`,
    `- Starting difficulty: ${config.difficulty || 'Medium'}`,
    `- Number of questions: ${config.numQuestions || '8-10'}`,
    `- Programming language: ${config.language || 'Not applicable'}`,
  ];

  if (config.jobDescription && config.jobDescription.trim()) {
    lines.push('', 'Job description provided by the candidate:', config.jobDescription.trim());
  }

  if (config.resume && config.resume.trim()) {
    lines.push('', 'Resume / project background provided by the candidate:', config.resume.trim());
  }

  lines.push(
    '',
    'The configuration above is already complete. Skip Section 1 (Interview Setup) and begin directly at Phase 1 (Introduction).'
  );

  return `${BASE_SYSTEM_PROMPT}\n\n---\n\n${lines.join('\n')}`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, config } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Optional: a key typed into the setup screen overrides the server's
    // own ANTHROPIC_API_KEY for this request only. Nothing is persisted.
    const overrideKey = req.headers['x-api-key-override'];
    const client = overrideKey ? new Anthropic({ apiKey: overrideKey }) : anthropic;

    if (!overrideKey && !process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        error:
          'No API key available. Set ANTHROPIC_API_KEY on the server, or enter a key on the setup screen.',
      });
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(config),
      messages,
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    res.json({ text });
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({
      error: 'Something went wrong talking to Claude. Check the server logs and your API key.',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.listen(PORT, () => {
  console.log(`InterviewAI server running on http://localhost:${PORT}`);
});
