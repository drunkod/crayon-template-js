import { getMockWeather } from '../mockTools'

describe('Mock Weather Tools', () => {
  it('returns weather data for Paris', async () => {
    const weather = await getMockWeather('Paris')

    expect(weather).toHaveProperty('location', 'Paris')
    expect(weather).toHaveProperty('country', 'France')
    expect(weather).toHaveProperty('temperature')
    expect(weather).toHaveProperty('humidity')
    expect(weather).toHaveProperty('windSpeed')
    expect(weather).toHaveProperty('icon')
  })

  it('returns weather data for Tokyo', async () => {
    const weather = await getMockWeather('Tokyo')

    expect(weather).toHaveProperty('location', 'Tokyo')
    expect(weather).toHaveProperty('country', 'Japan')
    expect(weather.temperature).toBe(22)
  })

  it('generates random weather for unknown cities', async () => {
    const weather = await getMockWeather('UnknownCity')

    expect(weather).toHaveProperty('location', 'UnknownCity')
    expect(weather).toHaveProperty('country', 'Mock Country')
    expect(weather).toHaveProperty('temperature')
    expect(weather.temperature).toBeGreaterThan(0)
  })

  it('includes timestamp in weather data', async () => {
    const weather = await getMockWeather('London')

    expect(weather).toHaveProperty('timestamp')
    expect(new Date(weather.timestamp)).toBeInstanceOf(Date)
  })

  it('returns consistent data structure', async () => {
    const weather = await getMockWeather('Sydney')

    const requiredFields = [
      'location',
      'country',
      'temperature',
      'feelsLike',
      'humidity',
      'windSpeed',
      'precipitation',
      'condition',
      'icon',
      'high',
      'low',
      'timestamp',
    ]

    requiredFields.forEach(field => {
      expect(weather).toHaveProperty(field)
    })
  })
})
