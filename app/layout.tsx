import "./globals.css";

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
      <body className="bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
