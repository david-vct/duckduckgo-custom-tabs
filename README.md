# DuckDuckGo Custom Tabs

A browser extension that lets you decide where DuckDuckGo search tabs should take you.

Instead of opening DuckDuckGo's default sections, you can send tabs like Maps, Videos, News, or Shopping to the services you actually use, and add your own shortcuts alongside them.

## What It Does

- Replace DuckDuckGo tabs such as Images, Maps, Videos, News, and Shopping with your preferred services.
- Keep using DuckDuckGo for web search while opening specific tabs in other tools.
- Add extra tabs for sites you want to access directly from the search page.
- Manage your preferred destinations from the extension popup.

## Examples

- Open Google Maps when clicking the Maps tab.
- Send video searches to YouTube instead of DuckDuckGo Videos.
- Redirect Shopping searches to Google Shopping or eBay.
- Open X from the News tab.
- Add a custom Wikipedia tab that searches the current query.

## Scope

- Active only on `https://duckduckgo.com/*`.
- Rewrites tab links on the results page and inserts custom tabs before `More` when that tab group is available.
- Supports Chromium and Firefox builds.

## How Configuration Works

Each destination is defined as a URL template containing `{search}`.

```text
https://www.google.com/maps/search/{search}
https://www.youtube.com/results?search_query={search}
https://en.wikipedia.org/wiki/Special:Search?search={search}
```

The current DuckDuckGo query is URL-encoded before replacement.

## Development

```bash
npm install
npm run dev
npm run build
npm test
```
