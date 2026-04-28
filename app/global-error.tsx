'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body className="flex items-center justify-center h-screen bg-zinc-900 text-white font-sans">
        <div className="text-center space-y-4">
          <h1 className="text-lg font-bold">FeTreeOS</h1>
          <p className="text-sm text-zinc-400">예기치 않은 오류가 발생했습니다.</p>
          <button
            onClick={reset}
            className="px-4 py-2 rounded bg-zinc-700 text-sm hover:bg-zinc-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
