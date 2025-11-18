// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Match what the app uses now
process.env.NEXT_PUBLIC_USE_MOCK_WEATHER = 'true'
process.env.NEXT_PUBLIC_USE_MOCK_OPENROUTER = 'true'
process.env.NEXT_PUBLIC_DEBUG_MODE = 'false' // keep logs off in tests
process.env.OPENROUTER_API_KEY = 'test-key'
process.env.OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'
process.env.OPENROUTER_SITE_URL = 'http://localhost:4000'
process.env.AI_PROVIDER = 'openrouter'
process.env.NEXT_PUBLIC_AI_PROVIDER = 'openrouter'
process.env.GEMINI_API_KEY = 'test-gemini-key'
process.env.GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai'
process.env.GEMINI_MODEL = 'gpt-4.1-mini'
