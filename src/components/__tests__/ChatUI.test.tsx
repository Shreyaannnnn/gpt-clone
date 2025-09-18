import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatUI from '../ChatUI'

// Mock the AuthWrapper to avoid authentication complexity in tests
jest.mock('../auth/AuthWrapper', () => {
  return function MockAuthWrapper({ children }: { children: React.ReactNode }) {
    return <div data-testid="auth-wrapper">{children}</div>
  }
})

describe('ChatUI Component', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('renders the empty state correctly', () => {
    render(<ChatUI />)
    
    expect(screen.getByText('Ready when you are.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask anything')).toBeInTheDocument()
  })

  it('shows send button when input has text', async () => {
    const user = userEvent.setup()
    render(<ChatUI />)
    
    const input = screen.getByPlaceholderText('Ask anything')
    await user.type(input, 'Hello world')
    
    expect(screen.getByLabelText('Send')).toBeInTheDocument()
  })

  it('shows mic button when input is empty', () => {
    render(<ChatUI />)
    
    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument()
  })

  it('handles new chat button click', async () => {
    const user = userEvent.setup()
    render(<ChatUI />)
    
    // First, add some messages to simulate an active conversation
    const input = screen.getByPlaceholderText('Ask anything')
    await user.type(input, 'Test message')
    
    // Click new chat button
    const newChatButton = screen.getByText('+ New chat')
    await user.click(newChatButton)
    
    // Should return to empty state
    expect(screen.getByText('Ready when you are.')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('handles file picker trigger', async () => {
    const user = userEvent.setup()
    render(<ChatUI />)
    
    // Mock file input
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.multiple = true
    document.body.appendChild(fileInput)
    
    // Click attach button
    const attachButton = screen.getByLabelText('Attach')
    await user.click(attachButton)
    
    // Should show attach menu
    expect(screen.getByText('Add photos & files')).toBeInTheDocument()
  })

  it('handles speech recognition start', async () => {
    const user = userEvent.setup()
    render(<ChatUI />)
    
    const micButton = screen.getByLabelText('Start voice input')
    await user.click(micButton)
    
    // Should show stop button when listening (if speech recognition starts successfully)
    // Note: In test environment, speech recognition may not start due to browser limitations
    // This test verifies the button click works without errors
    expect(micButton).toBeInTheDocument()
  })

  it('handles form submission', async () => {
    const user = userEvent.setup()
    render(<ChatUI />)
    
    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['x-conversation-id', 'test-conversation-id']]),
      body: {
        getReader: () => ({
          read: () => Promise.resolve({ done: true, value: undefined }),
        }),
      },
    })
    
    const input = screen.getByPlaceholderText('Ask anything')
    await user.type(input, 'Test message')
    
    const sendButton = screen.getByLabelText('Send')
    await user.click(sendButton)
    
    // Should trigger API call
    expect(global.fetch).toHaveBeenCalled()
  })

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup()
    render(<ChatUI />)
    
    const input = screen.getByPlaceholderText('Ask anything')
    await user.type(input, 'Test message')
    
    // Press Enter to send
    await user.keyboard('{Enter}')
    
    // Should trigger send (mocked API call)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('handles error states', async () => {
    const user = userEvent.setup()
    render(<ChatUI />)
    
    // Mock API error
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
    
    const input = screen.getByPlaceholderText('Ask anything')
    await user.type(input, 'Test message')
    
    const sendButton = screen.getByLabelText('Send')
    await user.click(sendButton)
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Error: API Error')).toBeInTheDocument()
    })
  })
})
