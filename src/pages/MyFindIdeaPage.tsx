import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Paragraph, useToast } from '@toss/tds-mobile';
import MySubpageLayout from '@/components/my/MySubpageLayout';
import { fetchIdeaByCode } from '@/services/ideaService';
import { useAuthStore } from '@/store/authStore';
import type { IIdea } from '@/types/idea';

export default function MyFindIdeaPage() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchedIdea, setSearchedIdea] = useState<IIdea | null>(null);
  const [isOwnIdea, setIsOwnIdea] = useState(false);

  const handleSubmit = () => {
    const code = input.trim().toUpperCase();
    if (code.length !== 8) {
      openToast('코드는 8자리예요.', { higherThanCTA: true, duration: 2000 });
      return;
    }
    void (async () => {
      try {
        setIsSearching(true);
        setSearched(true);
        setSearchedIdea(null);
        setIsOwnIdea(false);
        const result = await fetchIdeaByCode(code);
        if (!result) return;
        if (userId && result.creatorId === userId) {
          setIsOwnIdea(true);
          openToast('내가 만든 아이디어예요.', { higherThanCTA: true, duration: 2200 });
          return;
        }
        setSearchedIdea(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '검색에 실패했어요.';
        openToast(msg, { higherThanCTA: true, duration: 2600 });
      } finally {
        setIsSearching(false);
      }
    })();
  };

  const hasSearched = searched && !isSearching;
  const notFound = hasSearched && searchedIdea === null && !isOwnIdea;

  return (
    <MySubpageLayout title="찾기" subtitle="코드로 친구 아이디어 찾기">
      <section className="space-y-4 px-4 pt-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <Paragraph typography="t6" fontWeight="semibold" color="#191F28">
            친구에게 받은 코드를 입력하세요
          </Paragraph>
          <p className="mt-1 text-sm text-gray-500">
            공유 버튼을 누른 친구의 8자리 코드를 붙여넣기 하세요.
          </p>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={input}
              maxLength={8}
              placeholder="예: AB12CD34"
              className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-center font-mono text-base font-semibold uppercase tracking-widest text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onChange={(e) => {
                setInput(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, ''));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
            <Button
              size="medium"
              variant="fill"
              disabled={input.trim().length !== 8 || isSearching}
              loading={isSearching}
              onClick={handleSubmit}
            >
              검색
            </Button>
          </div>

          {notFound ? (
            <p className="mt-3 text-sm text-red-500">해당 코드의 아이디어를 찾을 수 없어요.</p>
          ) : null}
          {hasSearched && isOwnIdea ? (
            <p className="mt-3 text-sm text-red-500">내가 만든 아이디어예요.</p>
          ) : null}
        </div>

        {searchedIdea && !isOwnIdea ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-medium text-blue-500">찾은 아이디어</p>
            <h3 className="mt-1 text-base font-semibold text-gray-900">{searchedIdea.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{searchedIdea.description}</p>
            <p className="mt-2 text-xs text-gray-400">
              {searchedIdea.creatorDisplayName ?? '알 수 없음'} · {searchedIdea.totalVoteCount}표
            </p>
            <Button
              className="mt-4 w-full"
              variant="fill"
              onClick={() => navigate(`/feed?highlight=${searchedIdea.id}`)}
            >
              피드에서 보기
            </Button>
          </div>
        ) : null}
      </section>
    </MySubpageLayout>
  );
}
