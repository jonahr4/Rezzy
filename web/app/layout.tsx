import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ContainerWakeup } from '@/components/ContainerWakeup';

export const metadata: Metadata = {
  title: 'Rezzy — AI Resume Tailor',
  description:
    'AI-powered resume tailoring that selects your strongest bullets for every job description. Your voice first, AI assists.',
  keywords: ['resume', 'AI', 'job application', 'ATS', 'resume tailor', 'Rezzy'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="warm-dusk">
      <body>
        <AuthProvider>
          {/* Wake up ACA container immediately on any page load */}
          <ContainerWakeup />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
