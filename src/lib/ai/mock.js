/**
 * Mock AI responses for testing
 */

export async function getMockAIResponse(messages) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const lastMessage = messages[messages.length - 1];
  const text = lastMessage?.content || lastMessage?.text || '';

  const responses = [
    'Hello! How can I help you today?',
    "I'm a helpful AI assistant in mock mode!",
    'That\'s an interesting question. As a mock AI, I can provide general assistance.',
    'Feel free to ask me anything!',
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
