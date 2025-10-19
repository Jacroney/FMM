import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIChat } from '../AIChat';
import { AIService } from '../../services/aiService';
import { mockMessages } from '../../../test/fixtures/financial-data';

// Mock AIService
vi.mock('../../services/aiService', () => ({
  AIService: {
    sendMessage: vi.fn(),
    getConversationMessages: vi.fn()
  }
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

describe('AIChat', () => {
  const mockOnConversationCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render empty state when no messages', () => {
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      expect(screen.getByText('AI Financial Advisor')).toBeInTheDocument();
      expect(screen.getByText(/Ask me anything about your chapter's finances/)).toBeInTheDocument();
      expect(screen.getByText(/Try asking:/)).toBeInTheDocument();
    });

    it('should display suggested questions in empty state', () => {
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      expect(screen.getByText(/How much have we spent on events this month/)).toBeInTheDocument();
      expect(screen.getByText(/Are we on track with our budget/)).toBeInTheDocument();
      expect(screen.getByText(/What are our biggest expenses/)).toBeInTheDocument();
      expect(screen.getByText(/How should I plan next quarter's budget/)).toBeInTheDocument();
    });

    it('should render input field and send button', () => {
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      const sendButton = screen.getByRole('button');

      expect(input).toBeInTheDocument();
      expect(sendButton).toBeInTheDocument();
      expect(sendButton).toHaveAttribute('disabled');
    });

    it('should show keyboard shortcut hint', () => {
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      expect(screen.getByText(/Press Enter to send, Shift\+Enter for new line/)).toBeInTheDocument();
    });
  });

  describe('Loading conversation messages', () => {
    it('should load existing conversation messages on mount', async () => {
      vi.mocked(AIService.getConversationMessages).mockResolvedValueOnce(mockMessages);

      render(
        <AIChat
          conversationId="conv-1"
          onConversationCreated={mockOnConversationCreated}
        />
      );

      await waitFor(() => {
        expect(AIService.getConversationMessages).toHaveBeenCalledWith('conv-1');
      });

      await waitFor(() => {
        expect(screen.getByText(mockMessages[0].content)).toBeInTheDocument();
      });
    });

    it('should handle loading errors gracefully', async () => {
      vi.mocked(AIService.getConversationMessages).mockRejectedValueOnce(
        new Error('Failed to load')
      );

      render(
        <AIChat
          conversationId="conv-1"
          onConversationCreated={mockOnConversationCreated}
        />
      );

      await waitFor(() => {
        expect(AIService.getConversationMessages).toHaveBeenCalled();
      });

      // Should not crash, just log error
      expect(screen.getByPlaceholderText('Ask me anything about your finances...')).toBeInTheDocument();
    });
  });

  describe('Sending messages', () => {
    it('should enable send button when input has text', async () => {
      const user = userEvent.setup();
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      const sendButton = screen.getByRole('button');

      expect(sendButton).toHaveAttribute('disabled');

      await user.type(input, 'Test message');

      expect(sendButton).not.toHaveAttribute('disabled');
    });

    it('should send message and display optimistically', async () => {
      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockResolvedValueOnce({
        message: 'AI response',
        conversation_id: 'conv-new',
        tokens_used: 100
      });

      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'What is my budget status?');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      // Should show user message immediately (optimistic)
      expect(screen.getByText('What is my budget status?')).toBeInTheDocument();

      // Should call API
      await waitFor(() => {
        expect(AIService.sendMessage).toHaveBeenCalledWith(
          'What is my budget status?',
          undefined
        );
      });

      // Should show AI response
      await waitFor(() => {
        expect(screen.getByText('AI response')).toBeInTheDocument();
      });
    });

    it('should send message with Enter key', async () => {
      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockResolvedValueOnce({
        message: 'AI response',
        conversation_id: 'conv-new',
        tokens_used: 100
      });

      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Test message{Enter}');

      await waitFor(() => {
        expect(AIService.sendMessage).toHaveBeenCalled();
      });
    });

    it('should not send message with Shift+Enter (new line)', async () => {
      const user = userEvent.setup();
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(AIService.sendMessage).not.toHaveBeenCalled();
      expect(input).toHaveValue('Line 1\nLine 2');
    });

    it('should clear input after sending', async () => {
      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockResolvedValueOnce({
        message: 'AI response',
        conversation_id: 'conv-new',
        tokens_used: 100
      });

      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      // Input should be cleared immediately (optimistic)
      expect(input).toHaveValue('');
    });

    it('should call onConversationCreated for first message', async () => {
      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockResolvedValueOnce({
        message: 'AI response',
        conversation_id: 'conv-new-123',
        tokens_used: 100
      });

      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'First message');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnConversationCreated).toHaveBeenCalledWith('conv-new-123');
      });
    });

    it('should include conversation ID for follow-up messages', async () => {
      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockResolvedValueOnce({
        message: 'AI response',
        conversation_id: 'conv-1',
        tokens_used: 100
      });

      render(
        <AIChat
          conversationId="conv-1"
          onConversationCreated={mockOnConversationCreated}
        />
      );

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Follow up question');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      await waitFor(() => {
        expect(AIService.sendMessage).toHaveBeenCalledWith(
          'Follow up question',
          'conv-1'
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should handle send errors and remove optimistic message', async () => {
      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockRejectedValueOnce(
        new Error('OpenAI rate limit exceeded')
      );

      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      // Optimistic message should appear
      expect(screen.getByText('Test message')).toBeInTheDocument();

      // Wait for error
      await waitFor(() => {
        expect(AIService.sendMessage).toHaveBeenCalled();
      });

      // Optimistic message should be removed
      await waitFor(() => {
        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const sendButton = screen.getByRole('button');

      // Button should be disabled
      expect(sendButton).toHaveAttribute('disabled');

      // Try to click anyway
      await user.click(sendButton);

      expect(AIService.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, '   ');

      const sendButton = screen.getByRole('button');
      expect(sendButton).toHaveAttribute('disabled');
    });
  });

  describe('Loading states', () => {
    it('should show loading indicator while waiting for response', async () => {
      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          message: 'AI response',
          conversation_id: 'conv-1',
          tokens_used: 100
        }), 100))
      );

      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('disabled');
      });
    });

    it('should disable input while loading', async () => {
      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          message: 'AI response',
          conversation_id: 'conv-1',
          tokens_used: 100
        }), 100))
      );

      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      // Input should be disabled
      await waitFor(() => {
        expect(input).toHaveAttribute('disabled');
      });
    });
  });

  describe('Message display', () => {
    it('should display user and assistant messages correctly', async () => {
      vi.mocked(AIService.getConversationMessages).mockResolvedValueOnce(mockMessages);

      render(
        <AIChat
          conversationId="conv-1"
          onConversationCreated={mockOnConversationCreated}
        />
      );

      await waitFor(() => {
        mockMessages.forEach(msg => {
          expect(screen.getByText(msg.content)).toBeInTheDocument();
        });
      });
    });

    it('should display token usage for assistant messages', async () => {
      vi.mocked(AIService.getConversationMessages).mockResolvedValueOnce([
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Test response',
          created_at: new Date().toISOString(),
          tokens_used: 150
        }
      ]);

      render(
        <AIChat
          conversationId="conv-1"
          onConversationCreated={mockOnConversationCreated}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Tokens: 150')).toBeInTheDocument();
      });
    });

    it('should preserve whitespace and newlines in messages', async () => {
      const messageWithNewlines = 'Line 1\nLine 2\nLine 3';
      vi.mocked(AIService.sendMessage).mockResolvedValueOnce({
        message: messageWithNewlines,
        conversation_id: 'conv-1',
        tokens_used: 100
      });

      const user = userEvent.setup();
      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      await waitFor(() => {
        const messageElement = screen.getByText(messageWithNewlines);
        expect(messageElement).toHaveClass('whitespace-pre-wrap');
      });
    });
  });

  describe('Auto-scroll behavior', () => {
    it('should scroll to bottom when new messages arrive', async () => {
      const scrollIntoViewMock = vi.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      const user = userEvent.setup();
      vi.mocked(AIService.sendMessage).mockResolvedValueOnce({
        message: 'AI response',
        conversation_id: 'conv-1',
        tokens_used: 100
      });

      render(<AIChat onConversationCreated={mockOnConversationCreated} />);

      const input = screen.getByPlaceholderText('Ask me anything about your finances...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    });
  });
});
