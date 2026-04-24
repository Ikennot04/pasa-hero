import Bus from "../bus/bus.model.js";
import Route from "../route/route.model.js";
import Terminal from "../terminal/terminal.model.js";
import Driver from "../driver/driver.model.js";
import BusAssignment from "../bus_assignment/bus_assignment.model.js";
import Notification from "../notification/notification.model.js";
import BusStatus from "../bus_status/bus_status.model.js";

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

  async getTotalOccupancyCountPerRoute() {
    const [activeRoutes, busesByRoute] = await Promise.all([
      Route.find({ status: "active" }).select("_id route_name route_code").lean(),
      BusAssignment.aggregate([
        {
          $match: {
            assignment_status: "active",
            assignment_result: "pending",
          },
        },
        { $group: { _id: "$route_id", busIds: { $addToSet: "$bus_id" } } },
      ]),
    ]);

    const allBusIds = [
      ...new Set(
        busesByRoute.flatMap((row) => row.busIds.map((id) => String(id))),
      ),
    ];

    const occupancyByBusId = new Map();
    if (allBusIds.length > 0) {
      const statuses = await BusStatus.find({
        bus_id: { $in: allBusIds },
        is_deleted: false,
      })
        .select("bus_id occupancy_count")
        .lean();

      for (const s of statuses) {
        occupancyByBusId.set(String(s.bus_id), s.occupancy_count ?? 0);
      }
    }

    const totalOccupancyByRouteId = new Map(
      busesByRoute.map((row) => {
        const total = row.busIds.reduce(
          (sum, busId) => sum + (occupancyByBusId.get(String(busId)) ?? 0),
          0,
        );
        return [String(row._id), total];
      }),
    );

    return activeRoutes.map((route) => ({
      route_id: route._id,
      route_name: route.route_name,
      route_code: route.route_code,
      total_occupancy_count:
        totalOccupancyByRouteId.get(String(route._id)) ?? 0,
    }));
  },

  async getRoutePerformanceReport() {
    const [activeRoutes, notificationCountsByRoute] = await Promise.all([
      Route.find({ status: "active" }).select("_id route_name").lean(),
      Notification.aggregate([
        {
          $match: {
            route_id: { $ne: null },
            notification_type: { $in: ["delay", "full"] },
          },
        },
        {
          $group: {
            _id: "$route_id",
            total_delay_count: {
              $sum: {
                $cond: [{ $eq: ["$notification_type", "delay"] }, 1, 0],
              },
            },
            total_full_count: {
              $sum: {
                $cond: [{ $eq: ["$notification_type", "full"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const performanceByRouteId = new Map(
      notificationCountsByRoute.map((row) => [
        String(row._id),
        {
          total_delay_count: row.total_delay_count ?? 0,
          total_full_count: row.total_full_count ?? 0,
        },
      ]),
    );

    return activeRoutes.map((route) => {
      const routePerformance = performanceByRouteId.get(String(route._id));

      return {
        route_id: route._id,
        route_name: route.route_name,
        total_delay_count: routePerformance?.total_delay_count ?? 0,
        total_full_count: routePerformance?.total_full_count ?? 0,
      };
    });
  },
};
