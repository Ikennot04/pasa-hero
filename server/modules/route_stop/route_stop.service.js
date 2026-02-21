import RouteStop from "./route_stop.model.js";
import Route from "../route/route.model.js";

export const RouteStopService = {
  async createRouteStop(routeStopData) {
    const route = await Route.findById(routeStopData?.route_id);
    if (!route) {
      const error = new Error("This route does not exist.");
      error.statusCode = 404;
      throw error;
    }

    const routeStop = await RouteStop.create(routeStopData);
    return routeStop;
  },

  async getRouteStopsByRouteId(routeId) {
    const routeStops = await RouteStop.find({ route_id: routeId }).sort({
      stop_order: 1,
    });
    return routeStops;
  },
};
