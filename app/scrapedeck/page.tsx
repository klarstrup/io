import UserStuff from "../../components/UserStuff";
import { unique } from "../../utils";
import { scraperEndpoints } from "../api/scraper-utils";
import "../page.css";

export default function Page() {
  return (
    <center style={{ display: "flex", width: "100%", height: "100%" }}>
      <UserStuff />
      {unique(scraperEndpoints).map((scraperEndpoint) => (
        <div
          key={scraperEndpoint}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <h2>{scraperEndpoint}</h2>
          <iframe
            src={`/api/${scraperEndpoint}`}
            style={{ height: "100%", width: "100%", flex: 1 }}
          />
        </div>
      ))}
    </center>
  );
}
