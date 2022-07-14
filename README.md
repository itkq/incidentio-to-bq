# incidentio-to-bq

Load incident data from incident.io to BigQuery to analyze the MTTR etc.

## NOTE

This script is supposed to be executed on a daily basis. Since the amount of data is not large, the script will updsate the entire table every time instead of updating it incrementally.
