import { PortalLayout } from '@/components/portal';

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalLayout>{children}</PortalLayout>;
}
