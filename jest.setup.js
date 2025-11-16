// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.USE_MOCK_WEATHER = 'true'
process.env.USE_MOCK_OPENROUTER = 'true'
process.env.OPENROUTER_API_KEY = 'test-key'
process.env.OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'
process.env.OPENROUTER_SITE_URL = 'http://localhost:4000'
