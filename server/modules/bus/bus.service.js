import Bus from "./bus.model.js";
import BusStatus from "../bus_status/bus_status.model.js";
import BusAssignment from "../bus_assignment/bus_assignment.model.js";

export const BusService = {
  // GET ALL BUSES ===================================================================
  async getAllBuses() {
    const buses = await Bus.find().lean();
    if (buses.length === 0) return [];

    const busIds = buses.map((b) => b._id);

    const [statusDocs, assignments] = await Promise.all([
      BusStatus.find({
        bus_id: { $in: busIds.map((id) => String(id)) },
        is_deleted: false,
      }).lean(),
      BusAssignment.find({ bus_id: { $in: busIds } })
        .populate({ path: "route_id", select: "route_name route_code" })
        .populate({ path: "driver_id", select: "f_name l_name" })
        .populate({ path: "operator_user_id", select: "f_name l_name email" })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    const statusByBusId = new Map(
      statusDocs.map((s) => [String(s.bus_id), s]),
    );
    const assignmentsByBusId = new Map();
    for (const a of assignments) {
      const key = String(a.bus_id);
      if (!assignmentsByBusId.has(key)) assignmentsByBusId.set(key, []);
      assignmentsByBusId.get(key).push(a);
    }

    return buses.map((bus) => {
      const id = String(bus._id);
      return {
        ...bus,
        bus_status: statusByBusId.get(id) ?? null,
        assignments: assignmentsByBusId.get(id) ?? [],
      };
    });
  },
  // GET BUS BY ID ===================================================================
  async getBusById(id) {
    const bus = await Bus.findOne({ _id: id, });
    if (!bus) {
      const error = new Error("Bus not found.");
      error.statusCode = 404;
      throw error;
    }
    return bus;
  },
  // CREATE BUS ===================================================================
  async createBus(busData) {
    const existing = await Bus.findOne({
      $or: [
        { bus_number: busData.bus_number },
        { plate_number: busData.plate_number },
      ],
    });

    if(existing && existing?.is_deleted) {
      const error = new Error("This bus is deleted.");
      error.statusCode = 404;
      throw error;
    }

    if (existing) {
      const error = new Error(
        existing.plate_number === busData.plate_number
          ? "A bus with this plate number already exists."
          : "A bus with this bus number already exists.",
      );
      error.statusCode = 409;
      throw error;
    }
    const bus = await Bus.create(busData);
    return bus;
  },
  // UPDATE BUS BY ID ===================================================================
  async updateBusById(id, updateData) {
    const bus = await Bus.findOne({ _id: id, is_deleted: false });
    if (!bus) {
      const error = new Error("Bus not found.");
      error.statusCode = 404;
      throw error;
    }
    const bus_number = updateData.bus_number ?? bus.bus_number;
    const plate_number = updateData.plate_number ?? bus.plate_number;
    const existing = await Bus.findOne({
      _id: { $ne: id },
      is_deleted: false,
      $or: [
        { bus_number },
        { plate_number },
      ],
    });
    if (existing) {
      const error = new Error(
        existing.plate_number === plate_number
          ? "A bus with this plate number already exists."
          : "A bus with this bus number already exists.",
      );
      error.statusCode = 409;
      throw error;
    }
    const updated = await Bus.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    return updated;
  },
  // DELETE BUS BY ID (soft delete) ==================================================
  async deleteBusById(id) {
    const bus = await Bus.findOne({ _id: id, is_deleted: false });
    if (!bus) {
      const error = new Error("Bus not found.");
      error.statusCode = 404;
      throw error;
    }
    const updated = await Bus.findByIdAndUpdate(
      id,
      { is_deleted: true, deleted_at: new Date() },
      { new: true },
    );
    return updated;
  },
};
