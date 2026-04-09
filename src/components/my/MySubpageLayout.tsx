import type { ReactNode } from 'react';
import BrandPageHeader from '@/components/common/BrandPageHeader';

interface IMySubpageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** My 하위 화면 공통: 헤더 왼쪽 `<` 로 My 복귀 + 로고 + 제목/부제 + 본문 */
export default function MySubpageLayout(props: IMySubpageLayoutProps) {
  const { title, subtitle, children } = props;

  return (
    <main className="min-h-full bg-gray-50 pb-8">
      <BrandPageHeader title={title} subtitle={subtitle} backTo="/my" backLabel="My로 돌아가기" />
      {children}
    </main>
  );
}
