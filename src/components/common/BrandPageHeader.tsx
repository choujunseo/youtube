import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Paragraph } from '@toss/tds-mobile';
import TransparentLogo from '@/components/common/TransparentLogo';

interface IBrandPageHeaderProps {
  title: string;
  /** 타이틀 바로 아래(부제보다 위) */
  titleBottom?: ReactNode;
  /** 문자열이면 TDS 보조 타이포, 노드면 그대로(색·강조 커스텀용) */
  subtitle?: ReactNode;
  logoSrc?: string;
  logoAlt?: string;
  /** 설정 시 왼쪽 상단에 `<` 형태 뒤로 이동 */
  backTo?: string;
  backLabel?: string;
  /** 헤더 컨테이너 커스텀 클래스 */
  containerClassName?: string;
}

function ChevronBackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-900"
      aria-hidden
    >
      <path
        d="M15 6L9 12L15 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 탭 상단 공통: 로고 + TDS Paragraph 타이틀(톤앤매너 정렬) */
export default function BrandPageHeader(props: IBrandPageHeaderProps) {
  const {
    title,
    titleBottom,
    subtitle,
    logoSrc = '/logo.png',
    logoAlt = 'Idea League Logo',
    backTo,
    backLabel = '이전 화면',
    containerClassName,
  } = props;

  return (
    <header
      className={`sticky top-0 z-20 relative border-b border-gray-100 bg-white px-4 py-3 ${
        containerClassName ?? ''
      }`}
    >
      {backTo ? (
        <NavLink
          to={backTo}
          className="absolute left-1 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-xl active:bg-gray-100"
          aria-label={backLabel}
        >
          <ChevronBackIcon />
        </NavLink>
      ) : null}
      <div className="flex flex-col items-center">
        <TransparentLogo src={logoSrc} alt={logoAlt} className="h-[72px] w-auto object-contain" />
        <Paragraph typography="t5" fontWeight="semibold" textAlign="center" color="#191F28">
          {title}
        </Paragraph>
        {titleBottom != null ? <div className="mt-2 w-full max-w-md">{titleBottom}</div> : null}
        {subtitle != null && subtitle !== '' ? (
          <div className="mt-1 w-full max-w-md">
            {typeof subtitle === 'string' ? (
              <Paragraph typography="t7" fontWeight="regular" textAlign="center" color="#6B7684">
                {subtitle}
              </Paragraph>
            ) : (
              subtitle
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
