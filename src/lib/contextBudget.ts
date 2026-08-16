import { completeMessages, type LlmMessage } from './llm';
import type { ChatMessage } from '@/types';

// chars/4 is the standard rough heuristic; exact tokenization isn't needed
// for a budget check, just a number in the right ballpark.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Always kept raw, never folded into the summary, regardless of budget:
// the model's own most recent turns matter most for coherence.
const RECENT_TAIL_MESSAGES = 6;
// Reserved so the model actually has room to answer; not measurable ahead
// of time the way the prompt's own text is, so this one really is fixed.
const RESPONSE_HEADROOM_TOKENS = 768;
// Never let the history budget collapse to nothing even if the system
// prompt + retrieved context is unusually large for a small context window.
const MIN_HISTORY_BUDGET_TOKENS = 256;

const SUMMARY_SYSTEM_PROMPT = `You are compacting an earlier part of a conversation so it can be carried forward as short-term memory.
Summarize the key facts, decisions, questions, and answers below in 3-6 sentences.
Preserve anything a reader would need to understand later messages. Be concise and specific, not vague.`;
const SUMMARY_SYSTEM_PROMPT_TOKENS = estimateTokens(SUMMARY_SYSTEM_PROMPT);
// The summary itself is meant to be short (3-6 sentences); its generation
// call needs far less headroom than a full answer does.
const SUMMARY_RESPONSE_HEADROOM_TOKENS = 256;

function transcriptOf(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
}

/**
 * Takes messages from the front (oldest first) up to `budget`, always
 * including at least one so a single outsized message can't stall progress
 * forever. The summarization call has the same real context window as
 * everything else, so the batch fed into it must be bounded too, not just
 * the batch fed into the main answer.
 */
function takeWithinBudget(messages: ChatMessage[], budget: number): ChatMessage[] {
  const included: ChatMessage[] = [];
  let total = 0;
  for (const m of messages) {
    const tokens = estimateTokens(m.content);
    if (total + tokens > budget && included.length > 0) break;
    included.push(m);
    total += tokens;
  }
  return included;
}

/** Returns the new summary text and how many of `newlyAgedOut` (from the start) it actually covers. */
async function summarizeOlderMessages(
  priorSummary: string | undefined,
  newlyAgedOut: ChatMessage[],
  contextWindowTokens: number,
): Promise<{ summary: string; coveredCount: number }> {
  const summaryTokens = priorSummary ? estimateTokens(priorSummary) : 0;
  const budget = Math.max(
    contextWindowTokens - SUMMARY_RESPONSE_HEADROOM_TOKENS - SUMMARY_SYSTEM_PROMPT_TOKENS - summaryTokens,
    MIN_HISTORY_BUDGET_TOKENS,
  );
  const bounded = takeWithinBudget(newlyAgedOut, budget);

  const input = priorSummary
    ? `Previous summary of even earlier messages:\n${priorSummary}\n\nNewer messages to fold in:\n${transcriptOf(bounded)}`
    : transcriptOf(bounded);
  const summary = await completeMessages([
    { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
    { role: 'user', content: input },
  ]);
  return { summary: summary.trim(), coveredCount: bounded.length };
}

export interface PreparedHistory {
  /** Ready to splice between the main system message and the new user turn. */
  historyMessages: LlmMessage[];
  /** Set only when a NEW summarization pass just ran this turn, for showing the one-time note. */
  freshSummaryNote: string | null;
  /** Set only when the session's persisted summary state changed and needs to be written back. */
  updatedSummaryState: { contextSummary: string; contextSummarizedCount: number } | null;
}

/**
 * Budgets prior conversation turns against the model's real context window
 * (never a hardcoded assumption, see getContextWindowSize). Raw history is
 * used as-is while it fits; once it wouldn't fit, everything older than the
 * recent tail is folded into a rolling summary instead of being silently
 * dropped. The full raw history always stays in IndexedDB regardless, this
 * only affects what gets sent to the model.
 */
export async function prepareConversationHistory(
  priorMessages: ChatMessage[],
  existingSummary: string | undefined,
  existingSummarizedCount: number,
  contextWindowTokens: number,
  systemPromptTokens: number,
  userTurnTokens: number,
  /** Called right before the (rare) extra model call to (re)summarize, so callers can show an accurate status instead of guessing in advance. */
  onSummarizing?: () => void,
): Promise<PreparedHistory> {
  const realMessages = priorMessages.filter((m) => m.role !== 'note');
  const budget = Math.max(
    contextWindowTokens - RESPONSE_HEADROOM_TOKENS - systemPromptTokens - userTurnTokens,
    MIN_HISTORY_BUDGET_TOKENS,
  );

  const rawTotalTokens = realMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  // Everything fits raw: send it all as-is, regardless of message count.
  // The recent-tail/summary split below only matters once it doesn't fit.
  if (rawTotalTokens <= budget) {
    return { historyMessages: realMessages.map(toLlmMessage), freshSummaryNote: null, updatedSummaryState: null };
  }

  const tailCount = Math.min(RECENT_TAIL_MESSAGES, realMessages.length);
  const recentTail = realMessages.slice(realMessages.length - tailCount);
  const older = realMessages.slice(0, realMessages.length - tailCount);

  const summaryTokens = existingSummary ? estimateTokens(existingSummary) : 0;
  const tailTokens = recentTail.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  const newlyAgedOut = older.slice(existingSummarizedCount);

  const alreadyCoveredFits = newlyAgedOut.length === 0 && summaryTokens + tailTokens <= budget;
  if (alreadyCoveredFits) {
    const historyMessages: LlmMessage[] = [
      ...(existingSummary ? [{ role: 'system' as const, content: `Summary of earlier conversation: ${existingSummary}` }] : []),
      ...recentTail.map(toLlmMessage),
    ];
    return { historyMessages, freshSummaryNote: null, updatedSummaryState: null };
  }

  // Nothing new to fold in and no room to save: fall back to raw older+tail
  // trimmed from the oldest end until it fits, rather than calling the
  // model to "summarize" zero new content.
  if (newlyAgedOut.length === 0) {
    const trimmed = trimToBudget([...older, ...recentTail], budget);
    return { historyMessages: trimmed.map(toLlmMessage), freshSummaryNote: null, updatedSummaryState: null };
  }

  onSummarizing?.();
  const { summary: newSummary, coveredCount } = await summarizeOlderMessages(
    existingSummary,
    newlyAgedOut,
    contextWindowTokens,
  );
  const historyMessages: LlmMessage[] = [
    { role: 'system', content: `Summary of earlier conversation: ${newSummary}` },
    ...recentTail.map(toLlmMessage),
  ];
  return {
    historyMessages,
    freshSummaryNote: "Earlier messages were summarized to stay within the model's memory limit.",
    // existingSummarizedCount + coveredCount, not older.length: a very
    // large backlog may take more than one turn to fully fold in, each
    // pass making bounded progress rather than overflowing the summarizer's
    // own context window.
    updatedSummaryState: { contextSummary: newSummary, contextSummarizedCount: existingSummarizedCount + coveredCount },
  };
}

function toLlmMessage(m: ChatMessage): LlmMessage {
  return { role: m.role === 'note' ? 'assistant' : m.role, content: m.content };
}

function trimToBudget(messages: ChatMessage[], budget: number): ChatMessage[] {
  const kept: ChatMessage[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(messages[i].content);
    if (total + tokens > budget && kept.length > 0) break;
    kept.unshift(messages[i]);
    total += tokens;
  }
  return kept;
}
