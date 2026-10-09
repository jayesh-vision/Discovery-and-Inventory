# Client-wise upload files

One folder per client. Each folder is a complete upload for that client: 16 CSV files (one per sheet) and the same data as one Excel workbook. Upload either the 16 CSVs together or the .xlsx — not both.

| Client ID | Name | Data centers (LocationId) | Racks | Devices | Folder |
|---|---|---|---|---|---|
| TELCO-NORTH | Northern Telco Ltd | PB-DC-002, PB-DC-003 | 19 | 302 | `TELCO-NORTH/` |
| CLOUD-SOUTH | Southern Cloud Services | KA-DC-001, KA-DC-077 | 16 | 243 | `CLOUD-SOUTH/` |
| COLO-WEST | Western Colocation Pvt Ltd | MH-DC-005, MH-DC-006 | 18 | 251 | `COLO-WEST/` |

How to upload (Inventory › Data centers › Upload inventory):
1. Client step: choose **New client** and enter the Client ID and Name from the table — they must match the `ClientId` in DataCenters.csv, or the review blocks the upload.
2. File step: select all 16 CSV files of that client's folder (or its .xlsx).
3. Validate, then Upload. Repeat for the next client.

Each data center's `LocationId` is a real Inventory › Location site, so after upload the inventory also shows on that site's **Infrastructure** tab.
The devices are each site's own network elements (same names, IPs, models and serials as the site's Network elements tab).
Regenerate with `npm run gen:client-files`.
