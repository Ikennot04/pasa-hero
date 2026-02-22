export type TodayAssignmentsData = {
  scheduled: number;
  active: number;
  completed: number;
  cancelled: number;
};

type TodayAssignmentsProps = {
  data: TodayAssignmentsData;
  title?: string;
};

export function TodayAssignments({
  data,
  title = "Today's bus assignments",
}: TodayAssignmentsProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-base-200/80 p-3">
            <p className="text-base-content/70 text-sm">Scheduled</p>
            <p className="text-xl font-bold">{data.scheduled}</p>
          </div>
          <div className="rounded-lg bg-green-500/10 p-3">
            <p className="text-green-700 dark:text-green-400 text-sm">Active</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">
              {data.active}
            </p>
          </div>
          <div className="rounded-lg bg-base-200/80 p-3">
            <p className="text-base-content/70 text-sm">Completed</p>
            <p className="text-xl font-bold">{data.completed}</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3">
            <p className="text-red-700 dark:text-red-400 text-sm">Cancelled</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-400">
              {data.cancelled}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
