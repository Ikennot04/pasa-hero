import AssignmentDetailsClient from "./AssignmentDetailsClient";

export default async function AssignmentDetailsPage({
  params,
}: {
  params: Promise<{ assignment_id: string }>;
}) {
  const { assignment_id } = await params;
  return <AssignmentDetailsClient assignmentId={assignment_id} />;
}
