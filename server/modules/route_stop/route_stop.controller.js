import { RouteStopService } from "./route_stop.service.js";

export const getRouteStopsByRouteId = async (req, res) => {
  try {
    const { routeId } = req.params;
    const routeStops = await RouteStopService.getRouteStopsByRouteId(routeId);
    res.status(200).json({ success: true, data: routeStops });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const createRouteStop = async (req, res) => {
  try {
    const routeStopData = req.body;
    const routeStop = await RouteStopService.createRouteStop(routeStopData);
    res.status(201).json({ success: true, data: routeStop });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const updateRouteStopById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const routeStop = await RouteStopService.updateRouteStopById(id, updateData);
    res.status(200).json({ success: true, data: routeStop });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const deleteRouteStopById = async (req, res) => {
  try {
    const { id } = req.params;
    const routeStop = await RouteStopService.deleteRouteStopById(id);
    res.status(200).json({ success: true, data: routeStop, message: "Route stop deleted successfully." });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
