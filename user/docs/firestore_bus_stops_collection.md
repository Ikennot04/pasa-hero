# Firestore `bus_stops` collection

The map screen reads bus stops from the **`bus_stops`** collection. Each document’s **ID** is used as the **stop code** shown in the marker info window.

## Collection

- **Name:** `bus_stops`

## Document fields

| Field  | Type   | Required | Description        |
|--------|--------|----------|--------------------|
| `name` | string | Yes      | Bus stop name      |
| `route`| string | Yes      | Route number/code  |
| `lat`  | number | Yes      | Latitude           |
| `lng`  | number | Yes      | Longitude          |

## Example documents

### Document ID as stop code

Use the document ID as the stop code (e.g. `"BS-001"`, `"Mandaue-01"`). The app shows this in the marker snippet as “Stop &lt;id&gt;”.

**Document ID:** `BS-001`

```json
{
  "name": "Pacific Terminal",
  "route": "01K",
  "lat": 10.3232,
  "lng": 123.9456
}
```

**Document ID:** `BS-002`

```json
{
  "name": "Ayala Center Bus Stop",
  "route": "02A",
  "lat": 10.3192,
  "lng": 123.9076
}
```

### Firestore Console / CLI example

1. Create collection: `bus_stops`
2. Add document with ID (e.g. `BS-001`) and fields: `name` (string), `route` (string), `lat` (number), `lng` (number).

Security rules should restrict reads/writes as needed (e.g. allow read for authenticated users only).
