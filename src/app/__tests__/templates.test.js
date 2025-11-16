import { weatherCardTemplate } from '../templates'

describe('Weather Card Template', () => {
  const mockWeatherData = {
    location: 'Paris',
    temperature: 14,
    feelsLike: 13,
    humidity: 81,
    windSpeed: 6,
    condition: 'Slight rain',
    icon: '🌧️',
    high: 15,
    low: 12,
  }

  describe('match function', () => {
    it('matches valid weather object', () => {
      expect(weatherCardTemplate.match(mockWeatherData)).toBe(true)
    })

    it('matches valid weather JSON string', () => {
      const jsonString = JSON.stringify(mockWeatherData)
      expect(weatherCardTemplate.match(jsonString)).toBe(true)
    })

    it('does not match object without location', () => {
      const invalidData = { temperature: 14 }
      expect(weatherCardTemplate.match(invalidData)).toBe(false)
    })

    it('does not match object without temperature', () => {
      const invalidData = { location: 'Paris' }
      expect(weatherCardTemplate.match(invalidData)).toBe(false)
    })

    it('does not match invalid JSON string', () => {
      expect(weatherCardTemplate.match('not json')).toBe(false)
    })

    it('does not match null or undefined', () => {
      expect(weatherCardTemplate.match(null)).toBe(false)
      expect(weatherCardTemplate.match(undefined)).toBe(false)
    })
  })

  describe('props function', () => {
    it('returns correct props for object data', () => {
      const props = weatherCardTemplate.props(mockWeatherData)
      expect(props).toEqual({ data: mockWeatherData })
    })

    it('parses JSON string data', () => {
      const jsonString = JSON.stringify(mockWeatherData)
      const props = weatherCardTemplate.props(jsonString)
      expect(props.data).toEqual(mockWeatherData)
    })
  })

  describe('template configuration', () => {
    it('has correct type', () => {
      expect(weatherCardTemplate.type).toBe('weather_card')
    })

    it('has a component', () => {
      expect(weatherCardTemplate.component).toBeDefined()
    })
  })
})
