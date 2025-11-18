import './globals.css'
import '@crayonai/react-ui/styles/index.css';

export const metadata = {
  title: 'Weather Chat App',
  description: 'AI-powered weather assistant',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}