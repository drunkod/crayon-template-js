import { render, screen } from '@testing-library/react'
import { WeatherCard } from '../WeatherCard'

describe('WeatherCard', () => {
  const mockWeatherData = {
    location: 'Paris',
    country: 'France',
    temperature: 14,
    feelsLike: 13,
    humidity: 81,
    windSpeed: 6,
    precipitation: 0.1,
    condition: 'Slight rain',
    icon: '🌧️',
    high: 15,
    low: 12,
    timestamp: '2024-01-15T10:30:00Z',
  }

  it('renders weather information correctly', () => {
    render(<WeatherCard {...mockWeatherData} />)

    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByText('14°C')).toBeInTheDocument()
    expect(screen.getByText('Slight rain')).toBeInTheDocument()
    expect(screen.getByText('🌧️')).toBeInTheDocument()
  })

  it('renders weather details correctly', () => {
    render(<WeatherCard {...mockWeatherData} />)

    expect(screen.getByText('13°C')).toBeInTheDocument() // Feels like
    expect(screen.getByText('15° / 12°')).toBeInTheDocument() // High/Low
    expect(screen.getByText('81%')).toBeInTheDocument() // Humidity
    expect(screen.getByText('6 km/h')).toBeInTheDocument() // Wind speed
  })

  it('renders without country if not provided', () => {
    const dataWithoutCountry = { ...mockWeatherData, country: '' }
    render(<WeatherCard {...dataWithoutCountry} />)

    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.queryByText('France')).not.toBeInTheDocument()
  })
})
