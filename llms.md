---
url: 'https://developers-apps-in-toss.toss.im/development/llms.md'
description: >-
  IDE에서 AI가 더 정확한 코드를 생성할 수 있도록 컨텍스트 파일을 사용하는 방법을 안내합니다. llms.txt, 문서 URL, @docs
  기능을 활용하여 프로젝트 정보를 AI에게 주입해 보세요.
---

# AI 개발 가이드

AI가 프로젝트의 문맥을 이해하면 더 정확한 코드와 답변을 제공할 수 있어요.\
Cursor에서는 **문서(URL)** 또는 **llms.txt** 파일을 등록해 AI가 참고할 컨텍스트를 제공할 수 있으며,\
추가로 **MCP 서버를 사용하면** 훨씬 깊은 수준의 프로젝트 정보를 AI가 활용할 수 있어요.

::: tip 왜 컨텍스트가 필요한가요?
AI는 기본적으로 프로젝트의 도메인 지식을 알고 있지 않아요.\
SDK 사용법, API 구조, 에러 규칙 등 필요한 정보를 함께 제공하면 **정확도**와 **일관성**이 크게 향상돼요.
:::

## 1. MCP(Model Context Protocol) 서버 사용하기

Cursor는 **MCP(Model Context Protocol)** 를 지원해요.\
MCP는 IDE와 AI 모델 사이에서 프로젝트 정보를 더 구조적으로 전달하는 표준 프로토콜로,\
AI가 코드베이스의 맥락을 더 깊이 이해할 수 있도록 도와주는 역할을 해요.

앱인토스는 다양한 **SDK와 API(인앱 광고, 인앱 결제, 딥링크 등)** 를 제공하고 있는데,\
MCP를 함께 사용하면 다음과 같은 장점이 있어요:

* AI가 앱인토스 SDK 문서, API 스펙, 설정 파일을 자동으로 참조
* 인앱 광고, 인앱 결제 등 앱인토스의 기능을 더 짧은 코드로 빠르게 구현
* 잘못된 API 사용이나 누락된 파라미터 등을 AI가 조기에 감지
* 프로젝트 전체 구조(폴더, 설정, 자원 파일 등)를 기반으로 정확한 자동 생성 코드 구현

즉, MCP를 사용하면

> **앱인토스가 제공하는 기능을 훨씬 쉽게, 더 정확하게 구현할 수 있는 개발 환경을 만들 수 있어요.**\
> 기존 문서 기반 컨텍스트보다 더 깊은 통합을 제공한다는 점이 핵심입니다.

### 설치하기

::: code-group

```[MacOS]
brew tap toss/tap && brew install ax
```

```[Windows]
scoop bucket add toss  https://github.com/toss/scoop-bucket.git
scoop install ax
```

:::

### Cursor에 MCP 서버 연결하기

버튼이 작동하지 않을 경우, `.cursor/mcp.json` 파일을 생성하거나 수정해 아래 내용을 추가하세요.

```
{
 "mcpServers": {
   "apps-in-toss": {
     "command": "ax",
     "args": [
       "mcp", "start"
     ]
   }
 }
}
```

### Claude Code에서 MCP 연결하기

```
claude mcp add --transport stdio apps-in-toss ax mcp start
```

***

## 2. IDE 외 LLM에서 앱인토스 문서 활용하기

Cursor 외에도 Claude, Codex 같은 LLM 환경에서 앱인토스 공식 문서를 기반으로 답변을 받고 싶다면\
**Apps In Toss Skills**를 사용할 수 있어요.

### Apps In Toss Skills란?

Claude, Codex 등에서 사용 가능한 앱인토스 전용 에이전트 스킬 모음이에요.\
현재 제공되는 스킬은 다음과 같아요.

* `docs-search`
  * 앱인토스 `llms-full.txt` 문서를 다운로드·캐시하여 키워드 + 의미 유사도 기반으로 관련 스니펫을 검색해요.

### Codex (skill-installer UI)

1. `$skill-installer`를 실행하세요.
2. 다음 프롬프트를 입력해 스킬을 설치하세요.

```bash
install GitHub repo toss/apps-in-toss-skills path apps-in-toss
```

### Claude Code (plugin)

```bash
/plugin marketplace add toss/apps-in-toss-skills
/plugin install knowledge-skills@apps-in-toss-skills
```

### 프롬프트 예시

> Search guide with docs-search "How to develop Apps In Toss Mini App"

***

## 3. 문서 URL 등록하기 (@docs)

앱인토스 문서를 AI에 연결하려면 Cursor의 **Docs 인덱싱** 기능을 사용하세요.\
아래 단계에 따라 필요한 문서를 빠르게 등록할 수 있어요.

1. Cursor 화면 우측 상단의 **톱니바퀴(⚙️)** 아이콘을 클릭하세요.
2. 왼쪽 메뉴에서 **Indexing & Docs**를 선택하세요.
3. 화면 하단의 **Docs** 섹션으로 이동하세요.
4. `+Add Doc` 버튼을 클릭해 문서를 추가하세요.

### 추가할 수 있는 문서 URL

| 유형                           | 설명                                                                                             | URL                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **기본 문서 (권장)**           | 앱인토스 기능을 사용하는 데 필요한 핵심 정보들이 포함돼 있어요.                                  | `https://developers-apps-in-toss.toss.im/llms.txt`              |
| **모든 기능 포함 문서 (Full)** | 전체 문서를 포함한 확장 버전이에요.컨텍스트는 풍부하지만 **토큰 소모량이 증가**할 수 있어요. | `https://developers-apps-in-toss.toss.im/llms-full.txt`         |
| **예제 전용 문서**             | 앱인토스 예제 코드만 빠르게 참고하고 싶을 때 사용해요.                                           | `https://developers-apps-in-toss.toss.im/tutorials/examples.html` |
| **TDS 문서 (WebView)**         | TDS WebView 관련 정보가 포함돼 있어요.                                                           | `https://tossmini-docs.toss.im/tds-mobile/llms-full.txt`        |
| **TDS 문서 (React Native)**    | TDS React Native 정보가 포함돼 있어요.                                                           | `https://tossmini-docs.toss.im/tds-react-native/llms-full.txt`  |

![llms-1](/assets/llms-1.Ddl9380t.png)

## 4. 문서를 기반으로 AI 활용하기

문서를 등록하면 AI가 해당 문서를 기반으로 더 정확한 답변을 생성할 수 있어요.\
특히 Cursor에서는 `@docs` 명령을 사용하여 *지정된 문서를 우선적으로 참고*하도록 요청할 수 있어요.

```
@docs 앱인토스 인앱광고 샘플 코드 작성해줘
```

::: tip @docs는 언제 사용하나요?

* SDK처럼 **정확한 규칙 기반 코드**가 필요한 경우
* 문서 기반 의존도가 높은 기능을 사용할 때
* AI에게 “문서를 기반으로 답변해 달라”고 명확히 전달하고 싶을 때\
  `@docs`를 사용하면 AI는 문서를 우선적으로 참고해 더 안정적인 답변을 제공합니다.
  :::

AI는 `@docs` 없이도 문서를 자동으로 참고하지만,\
**정밀한 문맥 이해가 필요할 때는 `@docs`를 사용해 명시적으로 지시하는 것이 좋아요.**
