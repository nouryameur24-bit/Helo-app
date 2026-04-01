/**
 * Tests for lib/anthropic.ts
 * Mocks the Supabase edge function so no real network calls are made.
 */

// ─── Supabase mock ────────────────────────────────────────────────────────────
const mockInvoke = jest.fn();
jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: { invoke: mockInvoke },
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import {
  sendMessage,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  ChatMessage,
} from '../lib/anthropic';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeMsg(role: 'user' | 'assistant', content: string): ChatMessage {
  return { id: '1', role, content, timestamp: Date.now() };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('sendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns assistant text on success', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: [{ text: 'Bonjour ! Je suis Hēlo.' }] },
      error: null,
    });

    const reply = await sendMessage([], 'Bonjour');
    expect(reply).toBe('Bonjour ! Je suis Hēlo.');
    expect(mockInvoke).toHaveBeenCalledWith('chat', expect.objectContaining({
      body: expect.objectContaining({ messages: expect.any(Array) }),
    }));
  });

  test('includes last 10 history messages', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: [{ text: 'Réponse' }] },
      error: null,
    });

    const longHistory: ChatMessage[] = Array.from({ length: 15 }, (_, i) =>
      makeMsg(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
    );
    await sendMessage(longHistory, 'Nouvelle question');

    const callBody = mockInvoke.mock.calls[0][1].body;
    expect(callBody.messages.length).toBe(11); // 10 history + 1 new user message
  });

  test('returns error message when edge function returns error', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Function invocation failed'),
    });

    const reply = await sendMessage([], 'Test');
    expect(reply).toContain('erreur');
  });

  test('returns fallback when content is empty', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: [] },
      error: null,
    });

    const reply = await sendMessage([], 'Test');
    expect(reply).toContain("n'ai pas pu générer");
  });

  test('returns network error message on throw', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Network timeout'));

    const reply = await sendMessage([], 'Test');
    expect(reply).toContain('connexion');
  });
});

describe('chat history persistence', () => {
  beforeEach(async () => {
    await clearChatHistory();
  });

  test('loadChatHistory returns [] when empty', async () => {
    const history = await loadChatHistory();
    expect(history).toEqual([]);
  });

  test('saveChatHistory + loadChatHistory round-trips', async () => {
    const msgs: ChatMessage[] = [
      makeMsg('user', 'Bonjour'),
      makeMsg('assistant', 'Bonjour ! Je suis Hēlo.'),
    ];
    await saveChatHistory(msgs);
    const loaded = await loadChatHistory();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].content).toBe('Bonjour');
  });

  test('saveChatHistory trims to last 20 messages', async () => {
    const msgs: ChatMessage[] = Array.from({ length: 25 }, (_, i) =>
      makeMsg('user', `Message ${i}`)
    );
    await saveChatHistory(msgs);
    const loaded = await loadChatHistory();
    expect(loaded).toHaveLength(20);
  });

  test('clearChatHistory empties storage', async () => {
    await saveChatHistory([makeMsg('user', 'Test')]);
    await clearChatHistory();
    const loaded = await loadChatHistory();
    expect(loaded).toEqual([]);
  });
});
