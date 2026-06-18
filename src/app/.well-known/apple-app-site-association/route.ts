const APP_ID = "Y2NGBUL9V7.com.downsem.flipside";

const aasa = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [APP_ID],
        components: [
          { "/": "/import", comment: "Open FlipSide import links" },
          { "/": "/import/*", comment: "Open FlipSide import links" },
          { "/": "/create", comment: "Open FlipSide create links" },
          { "/": "/create/*", comment: "Open FlipSide create links" }
        ]
      },
      {
        appID: APP_ID,
        paths: ["/import", "/import/*", "/create", "/create/*"]
      }
    ]
  }
};

export const dynamic = "force-static";
export const revalidate = false;

export function GET() {
  return new Response(JSON.stringify(aasa), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
