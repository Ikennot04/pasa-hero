import { RouteStopService } from "./route_stop.service.js";

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
