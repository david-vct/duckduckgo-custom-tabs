# DuckDuckGo Custom Tabs

A browser extension that lets you redefine where DuckDuckGo search tabs go.

Instead of relying on DuckDuckGo's default destinations for tabs like Maps, Videos, or Shopping, the extension redirects those searches to the services you actually want to use.

## What It Does

- Redirects DuckDuckGo tabs such as Maps, Videos, and Shopping.
- Lets you replace a default target with another service.
- Injects additional custom tabs directly into the DuckDuckGo tab bar.

## Examples

- Open Google Maps from the Maps tab.
- Send video searches to YouTube.
- Redirect Shopping to another marketplace or comparison service.
- Add a custom tab for a service you use often.

## Current Scope

- Active only on `https://duckduckgo.com/*`.
- Built-in DuckDuckGo tabs supported today: Images, Maps, Videos, News, Shopping.
- Configuration is edited from the classic extension popup opened from the browser toolbar.
- URL templates must include the placeholder `{search}`.
- The extension rewrites tab links on DuckDuckGo pages and injects extra custom tabs into the main tab navigation before `More` when that menu is present.
- Automatic redirection after landing on an existing DuckDuckGo vertical is intentionally out of scope for the first version.

## How Configuration Works

Each configurable destination is stored as a URL template.

Examples:

```text
https://www.google.com/maps/search/{search}
https://www.youtube.com/results?search_query={search}
https://en.wikipedia.org/wiki/Special:Search?search={search}
```

The extension URL-encodes the current DuckDuckGo query before replacing `{search}`.

## UX Model

- Each built-in tab is shown as a simple row with the tab name on the left and the replacement URL on the right.
- Custom tabs are shown as rows with a name input and a URL input.
- A button at the bottom adds a new custom search tab.
- The browser toolbar action opens the popup directly.

## Status

The repository started from an Extension.js template, but now includes the first functional implementation of:

- settings storage,
- configuration UI,
- DuckDuckGo tab link rewriting,
- custom tab injection,
- Chromium and Firefox builds.

The main remaining work is hardening the DOM integration against future DuckDuckGo markup changes and extending automated coverage.

## Development

```bash
npm install
npm run dev
npm run build
npm run build:firefox
```

## Manual Verification

1. Load the unpacked extension build in Chromium or Firefox.
2. Open the extension panel from the browser toolbar.
3. Configure at least one built-in tab and save.
4. Visit a DuckDuckGo results page such as `https://duckduckgo.com/?q=toulouse`.
5. Check that the configured built-in tab points to the replacement service.
6. Add a custom tab and confirm that it appears in the DuckDuckGo tab bar before `More`.
