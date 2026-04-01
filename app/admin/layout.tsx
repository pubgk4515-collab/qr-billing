// app/admin/layout.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Bouncer check kar raha hai ki user ke paas 'store_id' ki chabi (cookie) hai ya nahi
  const cookieStore = await cookies();
  const storeId = cookieStore.get('store_id')?.value;

  // Agar chabi nahi hai, toh seedha dhakka maar ke /login pe bhej do!
  if (!storeId) {
    redirect('/login');
  }

  // Agar chabi hai, toh andar aane do
  return <>{children}</>;
}
