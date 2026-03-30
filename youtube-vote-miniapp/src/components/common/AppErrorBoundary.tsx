import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@toss/tds-mobile';

interface IProps {
  children: ReactNode;
}

interface IState {
  hasError: boolean;
  message: string;
}

/** 예기치 않은 렌더 오류 시 전역 안내 (다크패턴 방지: 명확한 안내 + 복구 동선) */
export default class AppErrorBoundary extends Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): IState {
    return { hasError: true, message: error.message || '알 수 없는 오류' };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-6 text-center">
          <p className="text-base font-semibold text-gray-900">화면을 불러오지 못했어요</p>
          <p className="mt-2 text-sm leading-5 text-gray-600">
            잠시 후 다시 시도해 주세요. 문제가 계속되면 앱을 완전히 닫았다가 다시 열어 주세요.
          </p>
          <p className="mt-3 max-w-full break-words text-xs text-gray-400">{this.state.message}</p>
          <div className="mt-8 w-full max-w-xs">
            <Button onClick={this.handleRetry}>다시 불러오기</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
