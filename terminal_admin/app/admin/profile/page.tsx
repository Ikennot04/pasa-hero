import { FaUserCircle } from "react-icons/fa";

const PROFILE_NAME = "Terminal Admin";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-lg py-6">
      <h1 className="mb-6 text-2xl font-bold text-base-content">Profile</h1>

      <div className="card bg-base-200 shadow-md">
        <div className="card-body gap-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content flex size-24 items-center justify-center rounded-full">
                <FaUserCircle className="size-20" />
              </div>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold">{PROFILE_NAME}</h2>
              <p className="text-base-content/70 text-sm">
                Terminal administrator account
              </p>
            </div>
          </div>

          <div className="divider my-0" />

          <dl className="grid gap-4 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="text-base-content/60 font-medium">Role</dt>
              <dd className="font-medium">Administrator</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <dt className="text-base-content/60 font-medium">Organization</dt>
              <dd className="font-medium">Terminal Admin</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
