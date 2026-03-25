import Route from "./route.model.js"; // Model

export const RouteService = {
  // GET ALL ROUTES ===================================================================
  async getAllRoutes() {
    const routes = await Route.find()
      .populate("start_terminal_id")
      .populate("end_terminal_id");
    return routes;
  },
  // CREATE ROUTE ===================================================================
  async createRoute(routeData) {
    if (routeData.start_terminal_id == routeData.end_terminal_id) {
      const error = new Error("Start and end terminals cannot be the same.");
      error.statusCode = 400;
      throw error;
    }

    if (!routeData.route_code) {
      const error = new Error("Route code is required.");
      error.statusCode = 400;
      throw error;
    }

    const duplicateRoute = await Route.findOne({
      start_terminal_id: routeData.start_terminal_id,
      end_terminal_id: routeData.end_terminal_id,
    });
    if (duplicateRoute) {
      const error = new Error("This route already exists.");
      error.statusCode = 409;
      throw error;
    }

    const duplicateRouteCode = await Route.findOne({
      route_code: routeData.route_code,
    });
    if (duplicateRouteCode) {
      const error = new Error("This route code already exists.");
      error.statusCode = 409;
      throw error;
    }

    const reverseRouteData = {
      ...routeData,
      start_terminal_id: routeData.end_terminal_id,
      end_terminal_id: routeData.start_terminal_id,
    };

    if (typeof routeData.route_name === "string") {
      const parts = routeData.route_name.split("-").map((p) => p.trim()).filter(Boolean);
      if (parts.length === 2) {
        reverseRouteData.route_name = `${parts[1]} - ${parts[0]}`;
      }
    }

    const session = await Route.startSession().catch(() => null);
    if (!session) {
      const route = await Route.create(routeData);

      const reverseExists = await Route.findOne({
        start_terminal_id: reverseRouteData.start_terminal_id,
        end_terminal_id: reverseRouteData.end_terminal_id,
      });
      if (!reverseExists) {
        await Route.create(reverseRouteData);
      }

      return route;
    }

    try {
      let createdRoute;

      await session.withTransaction(async () => {
        createdRoute = await Route.create([routeData], { session }).then((docs) => docs[0]);

        const reverseExists = await Route.findOne(
          {
            start_terminal_id: reverseRouteData.start_terminal_id,
            end_terminal_id: reverseRouteData.end_terminal_id,
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
    const route = await Route.findById(id)
      .populate("start_terminal_id")
      .populate("end_terminal_id");
    if (!route) {
      const error = new Error("Route not found.");
      error.statusCode = 404;
      throw error;
    }
    return route;
  },
  // UPDATE ROUTE BY ID ===================================================================
  async updateRouteById(id, updateData) {
    const route = await Route.findById(id);
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
    });
    if (duplicateRoute) {
      const error = new Error("This route already exists.");
      error.statusCode = 409;
      throw error;
    }

    const updated = await Route.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("start_terminal_id")
      .populate("end_terminal_id");
    return updated;
  },
};
