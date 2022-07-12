import fetch from "node-fetch";

type ListIncidentsRequest = {
  pageSize?: number; 
  after?: string;
  status?: string[];
}

type ListIncidentsResponse = {
  incidents: Incident[];
  pagination_meta: ListIncidentsPaginationMeta;
}

type ListIncidentsPaginationMeta = {
  after?: string;
  page_size: number;
  total_record_count: number;
}

interface Incident {
  id: string;
  // Omit attributes
}

export class IncidentIoClient {
  readonly apiEndpoint = "https://api.incident.io";
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async ListAllIncidents(): Promise<Incident[]> {
    let allIncidents: Incident[] = [];

    let after: string | undefined = undefined;
    let done = false;
    while (!done) {
      const resp: ListIncidentsResponse = await this.listIncidents({ after }); // XXX: why type inference doesn't work?
      allIncidents = allIncidents.concat(resp.incidents);

      after = resp.pagination_meta.after;
      if (after === undefined) {
        done = true;
      }

      // XXX: Sleep to avoid throttling
      this.sleep(3000);
    }

    return allIncidents;
  }

  // https://api-docs.incident.io/#operation/Incidents_List
  async listIncidents(input: ListIncidentsRequest): Promise<ListIncidentsResponse> {
    var url = new URL(this.apiEndpoint + "/v1/incidents");
    url.searchParams.append("page_size", (input.pageSize || 25).toString());
    if (input.after !== undefined) {
      url.searchParams.append("after", input.after);
    }
    if (input.status !== undefined) {
      for (const s of input.status) {
        url.searchParams.append("status", s);
      }
    }
  
    const resp = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
      method: "get",
    });
    const json = await resp.json();
    return (json as unknown as ListIncidentsResponse);
  }

  async sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }
}
