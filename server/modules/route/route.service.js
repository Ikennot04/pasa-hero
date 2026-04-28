import Route from "./route.model.js"; // Model
import BusAssignment from "../bus_assignment/bus_assignment.model.js";
import RouteStop from "../route_stop/route_stop.model.js";

const ACTIVE_ROUTE_FILTER = { is_deleted: { $ne: true } };

export const RouteService = {
  // GET ALL ROUTES ===================================================================
  async getAllRoutes() {
    const routeFilter = { route_type: "normal", ...ACTIVE_ROUTE_FILTER };

    const [routes, totalRoutes, activeRoutes, inactiveRoutes] = await Promise.all([
      Route.find(routeFilter).populate("start_terminal_id").populate("end_terminal_id"),
      Route.countDocuments(routeFilter),
      Route.countDocuments({ ...routeFilter, status: "active" }),
      Route.countDocuments({ ...routeFilter, status: "inactive" }),
    ]);

    const routeIds = routes.map((route) => route._id);

    const [activeBusesAcrossRoutes, activeBusesByRoute] = await Promise.all([
      BusAssignment.distinct("bus_id", {
        assignment_status: "active",
        route_id: { $in: routeIds },
      }).then((busIds) => busIds.length),
      BusAssignment.aggregate([
        { $match: { assignment_status: "active", route_id: { $in: routeIds } } },
        { $group: { _id: "$route_id", busIds: { $addToSet: "$bus_id" } } },
        { $project: { active_buses_count: { $size: "$busIds" } } },
      ]),
    ]);

    const activeBusesCountByRouteId = new Map(
      activeBusesByRoute.map((row) => [String(row._id), row.active_buses_count]),
    );

    const routesWithActiveBuses = routes.map((route) => {
      const plain = route.toObject();
      return {
        ...plain,
        active_buses_count: activeBusesCountByRouteId.get(String(route._id)) ?? 0,
      };
    });

    return {
      routes: routesWithActiveBuses,
      counts: {
        total_routes: totalRoutes,
        active_routes: activeRoutes,
        inactive_routes: inactiveRoutes,
        active_buses: activeBusesAcrossRoutes,
      },
    };
  },
  // GET ROUTES BY TERMINAL ID ==========================================================
  async getRoutesByTerminalId(terminalId) {
    const terminalFilter = {
      $or: [{ start_terminal_id: terminalId }, { end_terminal_id: terminalId }],
      route_type: "normal",
      ...ACTIVE_ROUTE_FILTER,
    };

    const routes = await Route.find(terminalFilter)
      .populate("start_terminal_id")
      .populate("end_terminal_id");

    const routeIds = routes.map((route) => route._id);

    const activeBusesByRoute = await BusAssignment.aggregate([
      { $match: { assignment_status: "active", route_id: { $in: routeIds } } },
      { $group: { _id: "$route_id", busIds: { $addToSet: "$bus_id" } } },
      { $project: { active_buses_count: { $size: "$busIds" } } },
    ]);

    const activeBusesAcrossRoutes = await BusAssignment.distinct("bus_id", {
      assignment_status: "active",
      route_id: { $in: routeIds },
    }).then((busIds) => busIds.length);

    const [totalRoutes, activeRoutes, inactiveRoutes] = await Promise.all([
      Route.countDocuments(terminalFilter),
      Route.countDocuments({ ...terminalFilter, status: "active" }),
      Route.countDocuments({ ...terminalFilter, status: "inactive" }),
    ]);

    const activeBusesCountByRouteId = new Map(
      activeBusesByRoute.map((row) => [String(row._id), row.active_buses_count]),
    );

    const routesWithActiveBuses = routes.map((route) => ({
      ...route.toObject(),
      active_buses_count: activeBusesCountByRouteId.get(String(route._id)) ?? 0,
    }));

    return {
      routes: routesWithActiveBuses,
      counts: {
        total_routes: totalRoutes,
        active_routes: activeRoutes,
        inactive_routes: inactiveRoutes,
        active_buses: activeBusesAcrossRoutes,
      },
    };
  },
  // CREATE ROUTE ===================================================================
  async createRoute(routeData) {
    const normalizedRouteType =
      routeData.route_type === "vice_versa" ? "vice_versa" : "normal";
    const primaryRouteData = { ...routeData, route_type: normalizedRouteType };
    const reverseRouteType = normalizedRouteType === "normal" ? "vice_versa" : "normal";

    if (routeData.start_terminal_id == routeData.end_terminal_id) {
      const error = new Error("Start and end terminals cannot be the same.");
      error.statusCode = 400;
      throw error;
    }

    const duplicateRoute = await Route.findOne({
      start_terminal_id: routeData.start_terminal_id,
      end_terminal_id: routeData.end_terminal_id,
      ...ACTIVE_ROUTE_FILTER,
    });
    if (duplicateRoute) {
      const error = new Error("This route already exists.");
      error.statusCode = 409;
      throw error;
    }

    const duplicateRouteCode = await Route.findOne({
      route_code: routeData.route_code,
      ...ACTIVE_ROUTE_FILTER,
    });
    if (duplicateRouteCode) {
      const error = new Error("This route code already exists.");
      error.statusCode = 409;
      throw error;
    }

    const reverseRouteData = {
      ...primaryRouteData,
      start_terminal_id: routeData.end_terminal_id,
      end_terminal_id: routeData.start_terminal_id ?? null,
      start_location: routeData.end_location ?? null,
      end_location: routeData.start_location ?? null,
      route_type: reverseRouteType,
    };

    if (typeof routeData.route_name === "string") {
      const parts = routeData.route_name.split("-").map((p) => p.trim()).filter(Boolean);
      if (parts.length === 2) {
        reverseRouteData.route_name = `${parts[1]} - ${parts[0]}`;
      }
    }

    const session = await Route.startSession().catch(() => null);
    if (!session) {
      const route = await Route.create(primaryRouteData);

      const reverseExists = await Route.findOne({
        start_terminal_id: reverseRouteData.start_terminal_id,
        end_terminal_id: reverseRouteData.end_terminal_id,
        ...ACTIVE_ROUTE_FILTER,
      });
      if (!reverseExists) {
        await Route.create(reverseRouteData);
      }

      return route;
    }

    try {
      let createdRoute;

      await session.withTransaction(async () => {
        createdRoute = await Route.create([primaryRouteData], { session }).then(
          (docs) => docs[0],
        );

        const reverseExists = await Route.findOne(
          {
            start_terminal_id: reverseRouteData.start_terminal_id,
            end_terminal_id: reverseRouteData.end_terminal_id,
            ...ACTIVE_ROUTE_FILTER,
          },
          null,
          { session },
        );

        if (!reverseExists) {
          await Route.create([reverseRouteData], { session });
        }
      });

      return createdRoute;
    } finally {
      session.endSession();
    }
  },
  // GET ROUTE BY ID ===================================================================
  async getRouteById(id) {
    const route = await Route.findOne({ _id: id, ...ACTIVE_ROUTE_FILTER })
      .populate("start_terminal_id")
      .populate("end_terminal_id");
    if (!route) {
      const error = new Error("Route not found.");
      error.statusCode = 404;
      throw error;
    }
    const [busIds, routeStops] = await Promise.all([
      BusAssignment.distinct("bus_id", {
        assignment_status: "active",
        route_id: route._id,
      }),
      RouteStop.find({ route_id: String(route._id) }).sort({ stop_order: 1 }),
    ]);
    return {
      ...route.toObject(),
      active_buses_count: busIds.length,
      route_stops: routeStops.map((stop) => stop.toObject()),
    };
  },
  // UPDATE ROUTE BY ID ===================================================================
  async updateRouteById(id, updateData) {
    const route = await Route.findOne({ _id: id, ...ACTIVE_ROUTE_FILTER });
    if (!route) {
      const error = new Error("Route not found.");
      error.statusCode = 404;
      throw error;
    }

    const start_terminal_id = updateData.start_terminal_id ?? route.start_terminal_id;
    const end_terminal_id = updateData.end_terminal_id ?? route.end_terminal_id;

    if (start_terminal_id === end_terminal_id) {
      const error = new Error("Start and end terminals cannot be the same.");
      error.statusCode = 400;
      throw error;
    }

    const duplicateRoute = await Route.findOne({
      start_terminal_id,
      end_terminal_id,
      _id: { $ne: id },
      ...ACTIVE_ROUTE_FILTER,
    });
    if (duplicateRoute) {
      const error = new Error("This route already exists.");
      error.statusCode = 409;
      throw error;
    }

    const updated = await Route.findOneAndUpdate({ _id: id, ...ACTIVE_ROUTE_FILTER }, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("start_terminal_id")
      .populate("end_terminal_id");
    return updated;
  },

  // SOFT DELETE ROUTE BY ID ============================================================
  async softDeleteRouteById(id) {
    const route = await Route.findOne({ _id: id, ...ACTIVE_ROUTE_FILTER });
    if (!route) {
      const error = new Error("Route not found.");
      error.statusCode = 404;
      throw error;
    }

    const deletedRoute = await Route.findByIdAndUpdate(
      id,
      {
        is_deleted: true,
        deleted_at: new Date(),
        status: "inactive",
      },
      { new: true },
    )
      .populate("start_terminal_id")
      .populate("end_terminal_id");

    return deletedRoute;
  },
};
