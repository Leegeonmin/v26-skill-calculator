import * as idleGameConfig from "../functions/api/idle-dev-game/config.js";
import * as idleGameRank from "../functions/api/idle-dev-game/rank.js";
import * as idleGameResult from "../functions/api/idle-dev-game/result.js";
import * as idleGameSession from "../functions/api/idle-dev-game/session.js";
import * as idleGameStats from "../functions/api/idle-dev-game/stats.js";

const REDIRECTS = new Map([
  ["/guide", "https://www.cpbv-lab.com/skill-score-method"],
  ["/methodology", "https://www.cpbv-lab.com/skill-score-method"],
  ["/calculator-guide", "https://www.cpbv-lab.com/skill-score-method"],
  ["/calculator", "/calculator/"],
  ["/simulator", "/simulator/"],
  ["/impact-change", "/impact-change/"],
  ["/skill-marble", "/skill-marble/"],
  ["/major-skill-marble", "/major-skill-marble/"],
  ["/ranking", "/ranking/"],
  ["/notice", "/notice/"],
  ["/skill-compare", "/skill-compare/"],
  ["/lineup-skill-ocr", "/lineup-skill-ocr/"],
  ["/training-redistribution", "/training-redistribution/"],
]);

const API_HANDLERS = new Map([
  ["/api/idle-dev-game/config", idleGameConfig],
  ["/api/idle-dev-game/rank", idleGameRank],
  ["/api/idle-dev-game/result", idleGameResult],
  ["/api/idle-dev-game/session", idleGameSession],
  ["/api/idle-dev-game/stats", idleGameStats],
]);

function redirectResponse(requestUrl, destination) {
  const location = new URL(destination, requestUrl).toString();
  return Response.redirect(location, 301);
}

async function serveAdmin(request, env) {
  const url = new URL(request.url);
  url.pathname = "/index.html";
  url.search = "";

  const response = await env.ASSETS.fetch(new Request(url, request));
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    const redirectDestination = REDIRECTS.get(pathname);
    if (redirectDestination) {
      return redirectResponse(url, redirectDestination);
    }

    if (pathname === "/admin") {
      return serveAdmin(request, env);
    }

    const apiHandler = API_HANDLERS.get(pathname);
    if (apiHandler) {
      return apiHandler.onRequest({
        request,
        env,
        ctx,
        waitUntil: ctx.waitUntil?.bind(ctx) ?? (() => {}),
      });
    }

    return env.ASSETS.fetch(request);
  },
};
