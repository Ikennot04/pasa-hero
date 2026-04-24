import Bus from "../bus/bus.model.js";
import Route from "../route/route.model.js";
import Terminal from "../terminal/terminal.model.js";
import Driver from "../driver/driver.model.js";
import BusAssignment from "../bus_assignment/bus_assignment.model.js";
import Notification from "../notification/notification.model.js";

export const DashboardService = {
  async getDashboardCounts() {
    const [
      activeBuses,
      activeRoutes,
      activeTerminals,
      activeDrivers,
      onRoadBuses,
      maintenanceBuses,
      totalAssignments,
      activeAssignments,
      completedAssignments,
      cancelledAssignments,
      scheduledAssignments,
      latestAlerts,
    ] = await Promise.all([
      Bus.countDocuments({ is_deleted: false, status: "active" }),
      Route.countDocuments({ status: "active" }),
      Terminal.countDocuments({ status: "active" }),
      Driver.countDocuments({ is_deleted: false, status: "active" }),
      BusAssignment.distinct("bus_id", {
        assignment_status: "active",
        assignment_result: "pending",
      }).then((busIds) => busIds.length),
      Bus.countDocuments({ is_deleted: false, status: "maintenance" }),
      BusAssignment.countDocuments(),
      BusAssignment.countDocuments({
        assignment_status: "active",
        assignment_result: "pending",
      }),
      BusAssignment.countDocuments({ assignment_result: "completed" }),
      BusAssignment.countDocuments({ assignment_result: "cancelled" }),
      BusAssignment.countDocuments({
        assignment_status: { $ne: "active" },
        assignment_result: "pending",
      }),
      Notification.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "title priority",
        )
        .lean(),
    ]);

    const idleBuses = Math.max(activeBuses - onRoadBuses - maintenanceBuses, 0);

    return {
      active_buses: activeBuses,
      active_routes: activeRoutes,
      active_terminals: activeTerminals,
      active_drivers: activeDrivers,
      live_bus_counts: {
        on_road: onRoadBuses,
        idle: idleBuses,
        maintenance: maintenanceBuses,
      },
      total_bus_assignments: {
        total: totalAssignments,
        scheduled: scheduledAssignments,
        completed: completedAssignments,
        active: activeAssignments,
        cancelled: cancelledAssignments,
      },
      latest_alerts: latestAlerts,
    };
  },

  async getActiveBusesPerRouteCount() {
    const [activeRoutes, activeBusesByRoute] = await Promise.all([
      Route.find({ status: "active" }).select("_id route_name route_code").lean(),
      BusAssignment.aggregate([
        {
          $match: {
            assignment_status: "active",
            assignment_result: "pending",
          },
        },
        { $group: { _id: "$route_id", busIds: { $addToSet: "$bus_id" } } },
        { $project: { _id: 1, active_buses_count: { $size: "$busIds" } } },
      ]),
    ]);

    const activeCountByRouteId = new Map(
      activeBusesByRoute.map((row) => [String(row._id), row.active_buses_count]),
    );

    return activeRoutes.map((route) => ({
      route_id: route._id,
      route_name: route.route_name,
      route_code: route.route_code,
      active_buses_count: activeCountByRouteId.get(String(route._id)) ?? 0,
    }));
  },
};
