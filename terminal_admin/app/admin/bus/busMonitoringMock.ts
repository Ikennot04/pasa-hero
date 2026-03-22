/** Mock assignments for terminal bus status (same terminal/routes as dashboard). */

export type TerminalBusAssignmentRow = {
  id: string;
  bus_id: string;
  bus_number: string;
  plate_number: string;
  route_name: string;
  route_code: string;
  driver_name: string;
  bus_fleet_status: "active" | "maintenance" | "out of service";
  scheduled_arrival_at: string;
  arrival_reported_at: string | null;
  arrival_confirmed_at: string | null;
  departure_reported_at: string | null;
  departure_confirmed_at: string | null;
};

export function buildTerminalBusAssignments(now: Date): TerminalBusAssignmentRow[] {
  const isoOffset = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  return [
    {
      id: "ba-1",
      bus_id: "bus-1",
      bus_number: "01-AB",
      plate_number: "ABC 1234",
      route_name: "PITX — NEDSA",
      route_code: "PITX-NED-01",
      driver_name: "R. Dela Cruz",
      bus_fleet_status: "active",
      scheduled_arrival_at: isoOffset(-140),
      arrival_reported_at: isoOffset(-145),
      arrival_confirmed_at: isoOffset(-138),
      departure_reported_at: isoOffset(-110),
      departure_confirmed_at: isoOffset(-105),
    },
    {
      id: "ba-2",
      bus_id: "bus-2",
      bus_number: "12C",
      plate_number: "XYZ 5678",
      route_name: "PITX — SM North EDSA",
      route_code: "PITX-SNE-02",
      driver_name: "L. Guerrero",
      bus_fleet_status: "active",
      scheduled_arrival_at: isoOffset(-75),
      arrival_reported_at: isoOffset(-76),
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-3",
      bus_id: "bus-3",
      bus_number: "13B",
      plate_number: "DEF 9012",
      route_name: "PITX — SM North EDSA",
      route_code: "PITX-SNE-02",
      driver_name: "C. Aquino",
      bus_fleet_status: "maintenance",
      scheduled_arrival_at: isoOffset(-45),
      arrival_reported_at: isoOffset(-46),
      arrival_confirmed_at: isoOffset(-41),
      departure_reported_at: isoOffset(-18),
      departure_confirmed_at: null,
    },
    {
      id: "ba-4",
      bus_id: "bus-4",
      bus_number: "02-D",
      plate_number: "GHI 3456",
      route_name: "PITX — Fairview",
      route_code: "PITX-FV-03",
      driver_name: "A. Torres",
      bus_fleet_status: "active",
      scheduled_arrival_at: isoOffset(-22),
      arrival_reported_at: isoOffset(-23),
      arrival_confirmed_at: isoOffset(-18),
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-5",
      bus_id: "bus-5",
      bus_number: "07E",
      plate_number: "JKL 7890",
      route_name: "PITX — NEDSA",
      route_code: "PITX-NED-01",
      driver_name: "M. Diaz",
      bus_fleet_status: "active",
      scheduled_arrival_at: isoOffset(12),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-6",
      bus_id: "bus-6",
      bus_number: "09F",
      plate_number: "MNO 2468",
      route_name: "PITX — Monumento",
      route_code: "PITX-MON-04",
      driver_name: "P. Velasco",
      bus_fleet_status: "active",
      scheduled_arrival_at: isoOffset(28),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-7",
      bus_id: "bus-7",
      bus_number: "11A",
      plate_number: "PQR 1357",
      route_name: "PITX — Fairview",
      route_code: "PITX-FV-03",
      driver_name: "J. Ramos",
      bus_fleet_status: "active",
      scheduled_arrival_at: isoOffset(46),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-8",
      bus_id: "bus-8",
      bus_number: "15G",
      plate_number: "STU 9753",
      route_name: "PITX — SM North EDSA",
      route_code: "PITX-SNE-02",
      driver_name: "E. Santos",
      bus_fleet_status: "out of service",
      scheduled_arrival_at: isoOffset(67),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
  ];
}
