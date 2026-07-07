import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#3182F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="배드민턴" />
        <meta name="description" content="DI GIST 배드민턴 동아리 통합 예약 및 매칭 시스템" />
        <link rel="manifest" href="/manifest.json" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalStyles = `
*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background-color: #F2F4F6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
  -webkit-font-smoothing: antialiased;
}

#root, [data-expo-router-root] {
  display: flex;
  flex: 1;
  min-height: 100vh;
  width: 100%;
}

/* 모바일 웹: 중앙 정렬 앱형 */
@media (max-width: 767px) {
  #root > div, [data-expo-router-root] > div {
    max-width: 100%;
    margin: 0 auto;
  }
}

/* 데스크톱: 전체 너비 웹앱 */
@media (min-width: 768px) {
  body { background-color: #E5E8EB; }
  #root > div, [data-expo-router-root] > div {
    width: 100%;
    max-width: none;
  }
}

/* 스크롤바 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #C5CDD6; border-radius: 3px; }
`;
