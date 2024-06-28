import Script from "next/script";
import "../page.css";

export default function Page() {
  return (
    <center style={{ display: "flex", width: "100%", height: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <h2>Fitocracy</h2>
        <iframe
          src="/api/fitocracy_scrape"
          style={{ height: "100%", width: "100%", flex: 1 }}
        />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <h2>MyFitnessPal</h2>
        <iframe
          src="/api/myfitnesspal_scrape"
          style={{ height: "100%", width: "100%", flex: 1 }}
        />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <h2>TopLogger</h2>
        <iframe
          src="/api/toplogger_scrape"
          style={{ height: "100%", width: "100%", flex: 1 }}
        />
      </div>
      <Script key="reload" id="reload">
        {
          "setInterval(()=>Array.from(window.frames).forEach(window=>window.location.reload()), 1000*60);"
        }
      </Script>
    </center>
  );
}
