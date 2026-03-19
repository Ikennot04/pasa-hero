"use client";

import { useMemo, type ReactNode } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import { FiBus, FiCheckCircle, FiClock, FiBell, FiMapPin } from "react-icons/fi";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const mockStats = {
  totalScheduled: 42,
  present: 12,
  departed: 18,
  pendingConfirmations: 6,
};

const mockArrivalData = {
  labels: ["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"],
  datasets: [
    {
      label: "Buses Arriving",
      data: [5, 8, 12, 9, 11, 7, 10],
      borderColor: "#3B82F6",
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      tension: 0.4,
      fill: true,
    },
    {
      label: "Buses Departed",
      data: [3, 6, 10, 8, 9, 5, 8],
      borderColor: "#10B981",
      backgroundColor: "rgba(16, 185, 129, 0.2)",
      tension: 0.4,
      fill: true,
    },
  ],
};

const mockPending = [
  { id: "ARR-001", type: "Arrival", bus: "Bus 102", eta: "5 min", status: "Waiting for confirmation" },
  { id: "DEP-041", type: "Departure", bus: "Bus 220", eta: "10 min", status: "Awaiting clearance" },
  { id: "ARR-009", type: "Arrival", bus: "Bus 017", eta: "2 min", status: "Waiting for confirmation" },
];

const mockNotifications = [
  { id: 1, message: "Driver for Bus 112 reported delay due to traffic.", time: "2m ago" },
  { id: 2, message: "New route assigned to Bus 045.", time: "18m ago" },
  { id: 3, message: "Terminal gate 3 maintenance scheduled at 6 PM.", time: "1h ago" },
];

const mockLiveStatus = [
  { id: "B-102", route: "North Loop", eta: "4 min", progress: 60 },
  { id: "B-054", route: "East Side", eta: "12 min", progress: 35 },
  { id: "B-018", route: "Central", eta: "3 min", progress: 80 },
];

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: ReactNode; color: string }) {
  return (
    <div className="card border border-base-200 shadow-sm bg-base-100">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-base-content/70">{title}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
          <div className={`rounded-xl p-3 text-white ${color}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const stats = useMemo(() => mockStats, []);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Terminal Dashboard</h1>
          <p className="text-sm text-base-content/70">Overview of today’s arrivals, departures, and notifications.</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Scheduled Today" value={stats.totalScheduled} icon={<FiBus size={24} />} color="bg-primary" />
        <StatCard title="Currently Present" value={stats.present} icon={<FiMapPin size={24} />} color="bg-secondary" />
        <StatCard title="Departed" value={stats.departed} icon={<FiCheckCircle size={24} />} color="bg-success" />
        <StatCard title="Pending Confirmations" value={stats.pendingConfirmations} icon={<FiClock size={24} />} color="bg-warning" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card border border-base-200 shadow-sm bg-base-100 lg:col-span-2">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Arrival / Departure Trend</h2>
              <span className="badge badge-outline">Live</span>
            </div>
            <div className="mt-6 h-[260px]">
              <Line
                data={mockArrivalData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "top" },
                    title: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true, grid: { drawBorder: false } },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="card border border-base-200 shadow-sm bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Approach Status</h2>
              <span className="badge badge-outline">Real-time</span>
            </div>
            <div className="mt-4 space-y-3">
              {mockLiveStatus.map((bus) => (
                <div key={bus.id} className="rounded-xl border border-base-200 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{bus.id} • {bus.route}</p>
                      <p className="text-xs text-base-content/70">ETA: {bus.eta}</p>
                    </div>
                    <span className="text-xs font-semibold text-base-content/60">{bus.progress}%</span>
                  </div>
                  <progress className="progress progress-primary w-full mt-2" value={bus.progress} max={100} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card border border-base-200 shadow-sm bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pending Confirmations</h2>
              <span className="badge badge-outline">Action needed</span>
            </div>
            <div className="mt-4 space-y-3">
              {mockPending.map((item) => (
                <div key={item.id} className="rounded-xl border border-base-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{item.type} • {item.bus}</p>
                      <p className="text-xs text-base-content/70">{item.status}</p>
                    </div>
                    <span className="badge badge-primary">{item.eta}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn btn-sm btn-success">Confirm</button>
                    <button className="btn btn-sm btn-ghost">View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card border border-base-200 shadow-sm bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Notifications</h2>
              <span className="badge badge-outline">Latest</span>
            </div>
            <div className="mt-4 space-y-2">
              {mockNotifications.map((note) => (
                <div key={note.id} className="flex items-start justify-between gap-3 rounded-xl border border-base-200 p-3">
                  <div className="flex-1">
                    <p className="text-sm">{note.message}</p>
                    <p className="text-xs text-base-content/60">{note.time}</p>
                  </div>
                  <FiBell className="text-base-content/60" size={18} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
