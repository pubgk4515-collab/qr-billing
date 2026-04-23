import "./globals.css";
import HomeButton from "./components/HomeButton";

export const metadata = {
  title: "QReBill | The Future of Retail OS",
  description: "Lightning-fast QR checkout meets predictive AI. No hardware required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050505] text-white selection:bg-emerald-500/30">
        {children}
        {/* 🔥 Universal Home Button */}
        <HomeButton />
      </body>
    </html>
  );
}
