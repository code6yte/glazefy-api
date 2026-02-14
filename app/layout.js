import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'Glazefy — AR Product Display Platform',
  description: 'Transform your products into interactive AR experiences. Let customers see your items in augmented reality before they buy.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
