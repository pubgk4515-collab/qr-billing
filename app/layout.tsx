import "./globals.css";
import HomeButton from "./components/HomeButton";

export const metadata = {
  title: "Rampurhat Collection | Enterprise POS",
  description: "Next-Gen Retail OS & Smart Billing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* 🔥 Universal Home Button */}
        <HomeButton />
      </body>
    </html>
  );
}
