"use client";

import CreateOperator from "./_components/CreateOperator";
import OperatorTable from "./_components/OperatorTable";

export default function OperatorsPage() {
  return (
    <div className="space-y-4 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Operators</h1>
          <p className="text-sm text-base-content/70 mt-1 max-w-xl">
            Create accounts for bus operators assigned to this terminal. They
            use the same terminal scope as you.
          </p>
        </div>
        <CreateOperator />
      </div>
      <OperatorTable />
    </div>
  );
}
