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
  private debug: boolean;
  constructor(apiKey: string, debug = false) {
    this.apiKey = apiKey;
    this.debug = debug;
  }

  async ListAllIncidents(): Promise<Incident[]> {
    let allIncidents: Incident[] = [];

    let after: string | undefined = undefined;
    let totalRecordCount: number | undefined = undefined;
    while (true) {
      const resp: ListIncidentsResponse = await this.listIncidents({ after }); // XXX: why type inference doesn't work?
      if (this.debug) {
        console.debug(resp);
      }
      if (totalRecordCount === undefined) {
        totalRecordCount = resp.pagination_meta.total_record_count;
      }

      allIncidents = allIncidents.concat(resp.incidents);
      if (allIncidents.length >= totalRecordCount) {
        break;
      }
      after = allIncidents[allIncidents.length - 1].id;

      // XXX: Sleep to avoid throttling
      await this.sleep(2000);
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
    if (resp.status !== 200) {
      const text = await resp.text();
      console.error(`error body => ${text}`);
      throw new Error(`Unexpected status code: ${resp.status}`);
    }
    const json = await resp.json();
    return (json as unknown as ListIncidentsResponse);
  }

  async sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }
}
