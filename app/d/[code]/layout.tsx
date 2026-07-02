import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';

interface Props {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from('dispatch_orders')
      .select('customer_name, branch')
      .eq('short_code', code.toUpperCase())
      .single();

    if (data) {
      const title = '聚英資訊 派工系統';
      const description = data.branch
        ? `${data.customer_name} / ${data.branch}`
        : data.customer_name;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          siteName: '聚英資訊保養維修派工單電子化系統',
        },
      };
    }
  } catch { /* 查詢失敗時使用預設值 */ }

  return {
    title: '聚英資訊 派工系統',
    description: '聚英資訊保養維修派工單電子化系統',
  };
}

export default function DispatchLayout({ children }: Props) {
  return <>{children}</>;
}
