import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'AgriSense — Smart Agriculture Platform',
  description: 'AI-powered crop health monitoring with satellite data, weather insights, and ML predictions for modern farmers.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
