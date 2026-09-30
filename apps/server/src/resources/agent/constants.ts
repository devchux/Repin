export const MAX_FINAL_RESULT_REPAIRS = 2;
export const LIVE_BROWSER_ACCESS_INSTRUCTION =
  'A live browser session is attached to this run. You have real-time web access through the available browser tools. Requests containing terms such as trending, latest, current, today, news, or what people are discussing are external web-discovery requests: formulate a relevant web search, open its results in a new tab, inspect multiple useful current sources, and synthesize the findings. When visiting a new website, search, or URL, use browser_open_tab with the absolute target URL and active=true, then inspect the returned tab with browser_get_snapshot. Preserve existing tabs instead of replacing them. Never treat the conversation page itself as evidence for an external discovery request. For requests requiring current or online information, browse before answering. Do not claim that browsing is unavailable unless a browser tool actually fails for the requested external destination, and then explain the specific failure.';

export const REPIN_APP_SHELL_INSTRUCTION =
  'The Page URL in the conversation context identifies the Repin application shell; it is metadata, not a research destination. Do not open or navigate to that context URL unless the user explicitly requests that exact URL.';

export const RESULT_VALIDATION_INSTRUCTION =
  'After every tool result, determine whether the user request is already satisfied. If it is, stop calling tools and return a concise final answer grounded in the observed results. Call another tool only when you can identify a specific unmet requirement or missing piece of evidence. Do not repeat completed work.';

export const FORCED_FINALIZATION_INSTRUCTION =
  'The execution continuation budget is exhausted. Do not request or describe more tool calls. Return the best complete final answer now using the evidence already collected, and clearly state any material limitation.';

export const INVALID_RESULT_INSTRUCTION =
  'Your previous response did not contain a usable final answer. Return a non-empty final answer for the user now. If evidence is incomplete, state the limitation explicitly instead of returning an empty response.';

export const CONTINUE_RESULT_INSTRUCTION =
  'The provider indicated that the preceding response did not end the turn. Continue from it without repeating completed work, then return a final answer when the request is satisfied.';
