import OpenAI from "openai";
export const FREE_MODELS = [
"deepseek/deepseek-r1:free",
"google/gemini-2.0-flash-exp:free",
"qwen/qwen-2.5-72b-instruct:free",
"meta-llama/llama-3.3-70b-instruct:free",
"mistralai/mistral-small-3.2-24b-instruct:free",
];
export const SYSTEM_PROMPT = `You are a helpful AI assistant. When users ask about weather, respond with structured JSON in this exact format: { "response": [ { "type": "template", "name": "weather", "templateProps": { "location": "CityName", "country": "Country", "temperature": 22, "feelsLike": 20, "humidity": 65, "windSpeed": 15, "condition": "Partly Cloudy", "icon": "⛅", "high": 25, "low": 18, "timestamp": "${new Date().toISOString()}" } } ] } For other questions, respond with plain text. Weather icons: ☀️ (sunny), ⛅ (partly cloudy), ☁️ (cloudy), 🌧️ (rainy), ⛈️ (stormy), 🌨️ (snowy), 🌫️ (foggy)`;
export const STREAM_HEADERS = {
"Content-Type": "text/event-stream",
"Cache-Control": "no-cache, no-transform",
Connection: "keep-alive",
};
export function isMockOpenRouter() {
return process.env.NEXT_PUBLIC_USE_MOCK_OPENROUTER === "true";
}
export function createOpenRouterClient() {
return new OpenAI({
apiKey: process.env.OPENROUTER_API_KEY,
baseURL: process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1",
defaultHeaders: {
"HTTP-Referer": process.env.OPENROUTER_SITE_URL,
"X-Title": "Weather Chat App",
},
});
}