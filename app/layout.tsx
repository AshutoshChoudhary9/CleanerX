import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FreshGuard – Protection In Every Drop',
  description: "India's #1 scientifically formulated cleaning brand. Eliminate 99.9% of germs. Keep your home fresh, clean, and protected — naturally.",
  keywords: 'floor cleaner, toilet cleaner, glass cleaner, disinfectant, FreshGuard, cleaning products India',
  openGraph: {
    title: 'FreshGuard – Protection In Every Drop',
    description: "India's most trusted cleaning brand with ISO & BIS certified formulas.",
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
