import RouteStop from "./route_stop.model.js";
import Route from "../route/route.model.js";

export const RouteStopService = {
  // CREATE ROUTE STOP ===================================================================
  async createRouteStop(routeStopData) {
    const route = await Route.findById(routeStopData?.route_id);
    if (!route) {
      const error = new Error("This route does not exist.");
      error.statusCode = 404;
      throw error;
    }

    const duplicateRouteStop = await RouteStop.findOne({
      route_id: routeStopData.route_id,
      stop_name: routeStopData.stop_name,
      route_order: routeStopData.route_order,
    });
    if (duplicateRouteStop) {
      const error = new Error("This route stop already exists.");
      error.statusCode = 409;
      throw error;
    }

    const routeStop = await RouteStop.create(routeStopData);
    return routeStop;
  },

  // GET ROUTE STOPS BY ROUTE ID ===================================================================
  async getRouteStopsByRouteId(routeId) {
    const routeStops = await RouteStop.find({ route_id: routeId }).sort({
      stop_order: 1,
    });
    return routeStops;
  },

  // UPDATE ROUTE STOP BY ID ===================================================================
  async updateRouteStopById(id, updateData) {
    const routeStop = await RouteStop.findById(id);
    if (!routeStop) {
      const error = new Error("Route stop not found.");
      error.statusCode = 404;
      throw error;
    }

    if (updateData.route_id) {
      const route = await Route.findById(updateData.route_id);
      if (!route) {
        const error = new Error("This route does not exist.");
        error.statusCode = 404;
        throw error;
      }
    }

    const updated = await RouteStop.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    return updated;
  },

  // DELETE ROUTE STOP BY ID ===================================================================
  async deleteRouteStopById(id) {
    const routeStop = await RouteStop.findById(id);
    if (!routeStop) {
      const error = new Error("Route stop not found.");
      error.statusCode = 404;
      throw error;
    }
    await RouteStop.findByIdAndDelete(id);
    return routeStop;
  },
};
