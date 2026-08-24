import { DemoBanner } from "@/components/demo-banner";
import { SiteHeader } from "@/components/site-header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <DemoBanner />
      <main>{children}</main>
    </>
  );
}
