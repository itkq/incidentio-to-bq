import { writeSync } from "fs";
import { IncidentIoClient } from "./incidentio";
import { BigQuery } from "@google-cloud/bigquery";
import { fileSync } from "tmp";

const loadEnvVar = (name: string, defaultValue?: string): string => {
  const v = process.env[name];
  if (v === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`${name} is required`);
  }

  return v;
}

const incidentioApiKey = loadEnvVar("INCIDENTIO_API_KEY");
const googleProjectId = loadEnvVar("GOOGLE_PROJECT_ID");
const datasetLocation = loadEnvVar("DATASET_LOCATION", "asia-northeast1");
const debug = loadEnvVar("DEBUG", "0") === "1";
const datasetId = "incidentio";
const incidentTableId = "incidents";

(async () => {
  const bigqueryClient = new BigQuery({ projectId: googleProjectId });
  const [ datasetExists ] = await bigqueryClient
    .dataset(datasetId, { location: datasetLocation })
    .exists();
  if (!datasetExists) {
    await bigqueryClient
      .dataset(datasetId, { location: datasetLocation })
      .create();
    console.log(`Dataset ${googleProjectId}:${datasetId} (location: ${datasetLocation}) created`);
  }

  const [ tableExists ] = await bigqueryClient
    .dataset(datasetId)
    .table(incidentTableId)
    .exists();
  // XXX: Refresh by table level
  if (tableExists) {
    await bigqueryClient
      .dataset(datasetId)
      .table(incidentTableId)
      .delete();
    console.log(`Table ${googleProjectId}:${datasetId}:${incidentTableId} (location: ${datasetLocation}) deleted`);
  }

  const incidentIoClient = new IncidentIoClient(incidentioApiKey, debug);
  const incidents = await incidentIoClient.ListAllIncidents();

  const tmpFile = fileSync();
  writeSync(tmpFile.fd, incidents.map(i => JSON.stringify(i)).join("\n"));

  const [ job ] = await bigqueryClient
    .dataset(datasetId, { projectId: googleProjectId })
    .table(incidentTableId)
    .load(tmpFile.name, {
      encoding: "UTF-8",
      format: "JSON",
      autodetect: true,
      schemaUpdateOptions: ["ALLOW_FIELD_ADDITION"],
    });

  const errors = job.status?.errors;
  if (errors && errors.length > 0) {
    throw errors;
  }

  console.log(`Job ${job.id} completed successfully.`);
})().catch(e => {
  console.error(e);
  process.exit(1);
})
