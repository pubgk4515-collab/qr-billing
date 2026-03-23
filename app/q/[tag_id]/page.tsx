'use client';

export default function QRTestPage({ params }: any) {
  // Ye ekdum simple Client Component hai jo cache ko tod dega
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black text-emerald-500 mb-4">
            Route Alive! 🚀
        </h1>
        <p className="text-zinc-400">
            Scanning Tag: {params?.id || params?.tag_id || "Unknown"}
        </p>
        <p className="mt-8 text-sm text-zinc-600">
            Agar aapko ye screen dikh rahi hai, matlab purana error hamesha ke liye mar chuka hai.
        </p>
    </div>
  );
}
