import { FaCircleExclamation } from "react-icons/fa6";

export type AlertItem = {
  id: number;
  message: string;
  priority: "high" | "medium" | "low";
};

type RecentAlertsProps = {
  alerts: AlertItem[];
  title?: string;
};

const priorityClass = (priority: AlertItem["priority"]) =>
  priority === "high"
    ? "text-red-500"
    : priority === "medium"
      ? "text-amber-500"
      : "text-base-content/50";

export function RecentAlerts({ alerts, title = "Recent alerts" }: RecentAlertsProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <ul className="divide-y divide-base-300">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-4 py-3 flex items-start gap-3">
              <FaCircleExclamation
                className={`size-5 shrink-0 mt-0.5 ${priorityClass(alert.priority)}`}
              />
              <span className="text-sm">{alert.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
