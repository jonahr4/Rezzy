import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "ResumeGenie",
  description: "AI Resume Tailor — source bank viewer and pipeline runs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          <main>{children}</main>
          <footer className="footer container">
            <div className="footer-text">ResumeGenie · Source Bank & Pipeline Viewer · Phase 1</div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
