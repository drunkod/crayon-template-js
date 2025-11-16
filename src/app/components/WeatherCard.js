// Component now receives props directly (not wrapped in data)
export function WeatherCard(props) {
  const weather = props;

  return (
    <div className="weather-card">
      <div className="weather-header">
        <div>
          <h3 className="location">{weather.location}</h3>
          {weather.country && <p className="country">{weather.country}</p>}
        </div>
        <div className="icon">{weather.icon}</div>
      </div>
      <div className="weather-main">
        <div className="temperature">{weather.temperature}°C</div>
        <div className="condition">{weather.condition}</div>
      </div>
      <div className="weather-details">
        <div className="detail">
          <span className="label">Feels like</span>
          <span className="value">{weather.feelsLike}°C</span>
        </div>
        <div className="detail">
          <span className="label">High / Low</span>
          <span className="value">{weather.high}° / {weather.low}°</span>
        </div>
        <div className="detail">
          <span className="label">Humidity</span>
          <span className="value">{weather.humidity}%</span>
        </div>
        <div className="detail">
          <span className="label">Wind</span>
          <span className="value">{weather.windSpeed} km/h</span>
        </div>
      </div>
      <div className="weather-footer">
        <small>Updated: {new Date(weather.timestamp).toLocaleTimeString()}</small>
      </div>
    </div>
  );
}