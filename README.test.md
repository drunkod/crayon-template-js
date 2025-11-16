# Testing Guide

## Running Tests

```bash
# Run tests in watch mode (for development)
pnpm test

# Run tests once (for CI/CD)
pnpm test:ci

# Run tests with coverage
pnpm test -- --coverage
```

## Test Structure

```
src/
├── app/
│   ├── __tests__/
│   │   └── templates.test.js          # Template matching tests
│   ├── api/
│   │   └── chat/
│   │       └── __tests__/
│   │           ├── mockTools.test.js   # Mock weather tool tests
│   │           ├── route.test.js       # API route tests
│   │           └── locationExtraction.test.js  # Location parsing tests
│   └── components/
│       └── __tests__/
│           └── WeatherCard.test.js     # Component tests
```

## Test Coverage

The test suite covers:

1. **Component Tests**
   - WeatherCard rendering
   - Data parsing (object vs JSON string)
   - Edge cases (missing country, etc.)

2. **API Route Tests**
   - Input validation
   - Mock mode functionality
   - Error handling

3. **Template Tests**
   - Weather data matching
   - JSON parsing
   - Invalid data handling

4. **Tool Tests**
   - Mock weather data generation
   - Known cities vs unknown cities
   - Data structure validation

5. **Utility Tests**
   - Location extraction from various message formats
   - Case insensitivity
   - Invalid input handling

## Writing New Tests

Example test structure:

```javascript
describe('Feature Name', () => {
  it('does something specific', () => {
    // Arrange
    const input = 'test data'

    // Act
    const result = functionToTest(input)

    // Assert
    expect(result).toBe('expected output')
  })
})
```

## Common Matchers

- `expect(value).toBe(expected)` - Strict equality
- `expect(value).toEqual(expected)` - Deep equality
- `expect(value).toHaveProperty('key')` - Object has property
- `expect(element).toBeInTheDocument()` - DOM element exists
- `expect(value).toBeGreaterThan(n)` - Numeric comparison

## Tips

1. Keep tests focused on one thing
2. Use descriptive test names
3. Test edge cases and error conditions
4. Mock external dependencies
5. Aim for >80% code coverage
