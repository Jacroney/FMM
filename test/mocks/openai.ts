import { vi } from 'vitest';

export const mockOpenAIEmbeddingResponse = {
  data: [
    {
      embedding: Array(1536).fill(0).map(() => Math.random()),
      index: 0
    }
  ],
  model: 'text-embedding-ada-002',
  usage: {
    prompt_tokens: 10,
    total_tokens: 10
  }
};

export const mockOpenAIChatResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-3.5-turbo',
  choices: [
    {
      message: {
        role: 'assistant',
        content: 'This is a mock AI response about your finances.'
      },
      finish_reason: 'stop',
      index: 0
    }
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150
  }
};

export const createMockOpenAIFetch = () => {
  return vi.fn((url: string, options?: any) => {
    if (url.includes('/embeddings')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockOpenAIEmbeddingResponse
      } as Response);
    }

    if (url.includes('/chat/completions')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockOpenAIChatResponse
      } as Response);
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    } as Response);
  });
};
