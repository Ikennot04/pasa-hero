// seed-data.js
import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import User from "../modules/user/user.model.js";
import Bus from "../modules/bus/bus.model.js";
import Route from "../modules/route/route.model.js";
import Terminal from "../modules/terminal/terminal.model.js";
import Driver from "../modules/driver/driver.model.js";
import RouteStop from "../modules/route_stop/route_stop.model.js";
import BusAssignment from "../modules/bus_assignment/bus_assignment.model.js";
import Notification from "../modules/notification/notification.model.js";
import UserNotification from "../modules/user_notification/user_notification.model.js";
import UserSubscription from "../modules/user_subscription/user_subscription.model.js";

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Terminal.deleteMany({});
    await Route.deleteMany({});
    await RouteStop.deleteMany({});
    await Bus.deleteMany({});
    await Driver.deleteMany({});
    await BusAssignment.deleteMany({});
    await Notification.deleteMany({});
    await UserNotification.deleteMany({});
    await UserSubscription.deleteMany({});

    console.log("🗑️  Cleared existing data");

    // ==========================================
    // 1. CREATE USERS
    // ==========================================
    const users = await User.insertMany([
      {
        f_name: "Juan",
        l_name: "Dela Cruz",
        email: "juan.delacruz@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz", // hashed password
        role: "super admin",
        status: "active",
        firebase_id: "firebase_admin_001",
      },
      {
        f_name: "Maria",
        l_name: "Santos",
        email: "maria.santos@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_operator_001",
      },
      {
        f_name: "Pedro",
        l_name: "Reyes",
        email: "pedro.reyes@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "terminal admin",
        status: "active",
        firebase_id: "firebase_terminal_001",
      },
      {
        f_name: "Ana",
        l_name: "Garcia",
        email: "ana.garcia@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_001",
      },
      {
        f_name: "Carlos",
        l_name: "Mendoza",
        email: "carlos.mendoza@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_002",
      },
      {
        f_name: "Lisa",
        l_name: "Tan",
        email: "lisa.tan@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_003",
      },
      {
        f_name: "Mark",
        l_name: "Reyes",
        email: "mark.reyes@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_004",
      },
      {
        f_name: "Sofia",
        l_name: "Cruz",
        email: "sofia.cruz@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_005",
      },
      {
        f_name: "Rico",
        l_name: "Alvarez",
        email: "rico.alvarez@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "operator",
        status: "active",
        firebase_id: "firebase_operator_002",
      },
      {
        f_name: "Jenny",
        l_name: "Lim",
        email: "jenny.lim@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "terminal admin",
        status: "active",
        firebase_id: "firebase_terminal_002",
      },
      {
        f_name: "Nina",
        l_name: "Ocampo",
        email: "nina.ocampo@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_006",
      },
      {
        f_name: "Derek",
        l_name: "Chua",
        email: "derek.chua@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "active",
        firebase_id: "firebase_user_007",
      },
      {
        f_name: "Elena",
        l_name: "Villanueva",
        email: "elena.villanueva@email.com",
        password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
        role: "user",
        status: "suspended",
        firebase_id: "firebase_user_008",
      },
    ]);

    console.log(`✅ Created ${users.length} users`);

    const [
      superAdmin,
      operator1,
      terminalAdmin1,
      user1,
      user2,
      user3,
      user4,
      user5,
      operator2,
      terminalAdmin2,
      user6,
      user7,
      user8,
    ] = users;

    // ==========================================
    // 2. CREATE TERMINALS
    // ==========================================
    const terminals = await Terminal.insertMany([
      {
        terminal_name: "SM City Cebu Terminal",
        location_lat: 10.3115,
        location_lng: 123.9185,
        status: "active",
      },
      {
        terminal_name: "Ayala Center Terminal",
        location_lat: 10.3181,
        location_lng: 123.9061,
        status: "active",
      },
      {
        terminal_name: "Carbon Market Terminal",
        location_lat: 10.2935,
        location_lng: 123.9026,
        status: "active",
      },
      {
        terminal_name: "Mandaue City Terminal",
        location_lat: 10.3357,
        location_lng: 123.9421,
        status: "active",
      },
      {
        terminal_name: "IT Park Terminal",
        location_lat: 10.3241,
        location_lng: 123.9044,
        status: "active",
      },
      {
        terminal_name: "Cebu South Bus Terminal",
        location_lat: 10.2476,
        location_lng: 123.8494,
        status: "active",
      },
      {
        terminal_name: "Waterfront Lahug Terminal",
        location_lat: 10.2942,
        location_lng: 123.9171,
        status: "active",
      },
    ]);

    console.log(`✅ Created ${terminals.length} terminals`);

    const [
      smTerminal,
      ayalaTerminal,
      carbonTerminal,
      mandaueTerminal,
      itParkTerminal,
      southBusTerminal,
      waterfrontTerminal,
    ] = terminals;

    // ==========================================
    // 3. CREATE ROUTES
    // ==========================================
    const routes = await Route.insertMany([
      {
        route_name: "SM to Ayala via Mango Avenue",
        route_code: "01A",
        start_terminal_id: smTerminal._id,
        end_terminal_id: ayalaTerminal._id,
        estimated_duration: 45,
        status: "active",
      },
      {
        route_name: "Carbon to Mandaue Express",
        route_code: "02B",
        start_terminal_id: carbonTerminal._id,
        end_terminal_id: mandaueTerminal._id,
        estimated_duration: 30,
        status: "active",
      },
      {
        route_name: "IT Park to SM Loop",
        route_code: "03C",
        start_terminal_id: itParkTerminal._id,
        end_terminal_id: smTerminal._id,
        estimated_duration: 35,
        status: "active",
      },
      {
        route_name: "Ayala to Carbon Direct",
        route_code: "04D",
        start_terminal_id: ayalaTerminal._id,
        end_terminal_id: carbonTerminal._id,
        estimated_duration: 25,
        status: "active",
      },
      {
        route_name: "Mandaue to IT Park Circuit",
        route_code: "05E",
        start_terminal_id: mandaueTerminal._id,
        end_terminal_id: itParkTerminal._id,
        estimated_duration: 40,
        status: "active",
      },
      {
        route_name: "South Bus to SM Express",
        route_code: "06F",
        start_terminal_id: southBusTerminal._id,
        end_terminal_id: smTerminal._id,
        estimated_duration: 50,
        status: "active",
        route_type: "normal",
      },
      {
        route_name: "Waterfront to Ayala Shuttle",
        route_code: "07G",
        start_terminal_id: waterfrontTerminal._id,
        end_terminal_id: ayalaTerminal._id,
        estimated_duration: 20,
        status: "active",
        route_type: "vice_versa",
      },
    ]);

    console.log(`✅ Created ${routes.length} routes`);

    const [route01A, route02B, route03C, route04D, route05E, route06F, route07G] =
      routes;

    // ==========================================
    // 4. CREATE ROUTE STOPS
    // ==========================================
    const routeStops = await RouteStop.insertMany([
      // Route 01A: SM to Ayala
      {
        route_id: route01A._id,
        stop_name: "SM City Cebu",
        stop_order: 1,
        latitude: 10.3115,
        longitude: 123.9185,
      },
      {
        route_id: route01A._id,
        stop_name: "Mango Square",
        stop_order: 2,
        latitude: 10.3143,
        longitude: 123.9134,
      },
      {
        route_id: route01A._id,
        stop_name: "Capitol Site",
        stop_order: 3,
        latitude: 10.3167,
        longitude: 123.9089,
      },
      {
        route_id: route01A._id,
        stop_name: "Fuente Osmeña",
        stop_order: 4,
        latitude: 10.3156,
        longitude: 123.9023,
      },
      {
        route_id: route01A._id,
        stop_name: "Ayala Center",
        stop_order: 5,
        latitude: 10.3181,
        longitude: 123.9061,
      },

      // Route 02B: Carbon to Mandaue
      {
        route_id: route02B._id,
        stop_name: "Carbon Market",
        stop_order: 1,
        latitude: 10.2935,
        longitude: 123.9026,
      },
      {
        route_id: route02B._id,
        stop_name: "Colon Street",
        stop_order: 2,
        latitude: 10.2965,
        longitude: 123.9001,
      },
      {
        route_id: route02B._id,
        stop_name: "Pier Area",
        stop_order: 3,
        latitude: 10.3012,
        longitude: 123.9067,
      },
      {
        route_id: route02B._id,
        stop_name: "Mandaue City Hall",
        stop_order: 4,
        latitude: 10.3298,
        longitude: 123.9387,
      },
      {
        route_id: route02B._id,
        stop_name: "Mandaue Terminal",
        stop_order: 5,
        latitude: 10.3357,
        longitude: 123.9421,
      },

      // Route 03C: IT Park to SM
      {
        route_id: route03C._id,
        stop_name: "IT Park",
        stop_order: 1,
        latitude: 10.3241,
        longitude: 123.9044,
      },
      {
        route_id: route03C._id,
        stop_name: "JY Square",
        stop_order: 2,
        latitude: 10.3189,
        longitude: 123.9112,
      },
      {
        route_id: route03C._id,
        stop_name: "Gaisano Country Mall",
        stop_order: 3,
        latitude: 10.3145,
        longitude: 123.9156,
      },
      {
        route_id: route03C._id,
        stop_name: "SM City Cebu",
        stop_order: 4,
        latitude: 10.3115,
        longitude: 123.9185,
      },

      // Route 04D: Ayala to Carbon
      {
        route_id: route04D._id,
        stop_name: "Ayala Center",
        stop_order: 1,
        latitude: 10.3181,
        longitude: 123.9061,
      },
      {
        route_id: route04D._id,
        stop_name: "Mabolo Church",
        stop_order: 2,
        latitude: 10.3134,
        longitude: 123.9045,
      },
      {
        route_id: route04D._id,
        stop_name: "Robinsons Cybergate",
        stop_order: 3,
        latitude: 10.3078,
        longitude: 123.9023,
      },
      {
        route_id: route04D._id,
        stop_name: "Carbon Market",
        stop_order: 4,
        latitude: 10.2935,
        longitude: 123.9026,
      },

      // Route 05E: Mandaue to IT Park
      {
        route_id: route05E._id,
        stop_name: "Mandaue Terminal",
        stop_order: 1,
        latitude: 10.3357,
        longitude: 123.9421,
      },
      {
        route_id: route05E._id,
        stop_name: "Parkmall",
        stop_order: 2,
        latitude: 10.3312,
        longitude: 123.9289,
      },
      {
        route_id: route05E._id,
        stop_name: "AS Fortuna",
        stop_order: 3,
        latitude: 10.3278,
        longitude: 123.9145,
      },
      {
        route_id: route05E._id,
        stop_name: "IT Park",
        stop_order: 4,
        latitude: 10.3241,
        longitude: 123.9044,
      },

      // Route 06F: South Bus to SM
      {
        route_id: route06F._id,
        stop_name: "Cebu South Bus Terminal",
        stop_order: 1,
        latitude: 10.2476,
        longitude: 123.8494,
      },
      {
        route_id: route06F._id,
        stop_name: "Talisay City Hall",
        stop_order: 2,
        latitude: 10.2442,
        longitude: 123.8491,
      },
      {
        route_id: route06F._id,
        stop_name: "Natalio B. Bacalso Ave (Highway)",
        stop_order: 3,
        latitude: 10.275,
        longitude: 123.8612,
      },
      {
        route_id: route06F._id,
        stop_name: "SM City Cebu",
        stop_order: 4,
        latitude: 10.3115,
        longitude: 123.9185,
      },

      // Route 07G: Waterfront to Ayala
      {
        route_id: route07G._id,
        stop_name: "Waterfront Lahug",
        stop_order: 1,
        latitude: 10.2942,
        longitude: 123.9171,
      },
      {
        route_id: route07G._id,
        stop_name: "Salinas Drive",
        stop_order: 2,
        latitude: 10.3021,
        longitude: 123.9114,
      },
      {
        route_id: route07G._id,
        stop_name: "Camputhaw",
        stop_order: 3,
        latitude: 10.3098,
        longitude: 123.9075,
      },
      {
        route_id: route07G._id,
        stop_name: "Ayala Center",
        stop_order: 4,
        latitude: 10.3181,
        longitude: 123.9061,
      },
    ]);

    console.log(`✅ Created ${routeStops.length} route stops`);

    // ==========================================
    // 5. CREATE BUSES
    // ==========================================
    const buses = await Bus.insertMany([
      {
        bus_number: "CEB-001",
        plate_number: "ABC-1234",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-002",
        plate_number: "ABC-1235",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-003",
        plate_number: "ABC-1236",
        capacity: 45,
        status: "active",
      },
      {
        bus_number: "CEB-004",
        plate_number: "ABC-1237",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-005",
        plate_number: "ABC-1238",
        capacity: 45,
        status: "maintenance",
      },
      {
        bus_number: "CEB-006",
        plate_number: "ABC-1239",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-007",
        plate_number: "ABC-1240",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-008",
        plate_number: "ABC-1241",
        capacity: 45,
        status: "active",
      },
      {
        bus_number: "CEB-009",
        plate_number: "ABC-1242",
        capacity: 50,
        status: "active",
      },
      {
        bus_number: "CEB-010",
        plate_number: "ABC-1243",
        capacity: 50,
        status: "out of service",
      },
      {
        bus_number: "CEB-011",
        plate_number: "CEB-9011",
        capacity: 52,
        status: "active",
      },
      {
        bus_number: "CEB-012",
        plate_number: "CEB-9012",
        capacity: 48,
        status: "active",
      },
      {
        bus_number: "CEB-013",
        plate_number: "CEB-9013",
        capacity: 50,
        status: "active",
      },
    ]);

    console.log(`✅ Created ${buses.length} buses`);

    const [
      bus1,
      bus2,
      bus3,
      bus4,
      bus5,
      bus6,
      bus7,
      bus8,
      bus9,
      bus10,
      bus11,
      bus12,
      bus13,
    ] = buses;

    // ==========================================
    // 6. CREATE DRIVERS
    // ==========================================
    const drivers = await Driver.insertMany([
      {
        f_name: "Ramon",
        l_name: "Cruz",
        license_number: "D01-12-345678",
        contact_number: "09171234567",
        status: "active",
      },
      {
        f_name: "Jose",
        l_name: "Bautista",
        license_number: "D01-12-345679",
        contact_number: "09171234568",
        status: "active",
      },
      {
        f_name: "Antonio",
        l_name: "Luna",
        license_number: "D01-12-345680",
        contact_number: "09171234569",
        status: "active",
      },
      {
        f_name: "Miguel",
        l_name: "Ramos",
        license_number: "D01-12-345681",
        contact_number: "09171234570",
        status: "active",
      },
      {
        f_name: "Fernando",
        l_name: "Santos",
        license_number: "D01-12-345682",
        contact_number: "09171234571",
        status: "active",
      },
      {
        f_name: "Roberto",
        l_name: "Torres",
        license_number: "D01-12-345683",
        contact_number: "09171234572",
        status: "active",
      },
      {
        f_name: "Eduardo",
        l_name: "Gomez",
        license_number: "D01-12-345684",
        contact_number: "09171234573",
        status: "inactive",
      },
      {
        f_name: "Paolo",
        l_name: "Navarro",
        license_number: "D01-12-345685",
        contact_number: "09171234574",
        status: "active",
      },
      {
        f_name: "Luis",
        l_name: "Fernandez",
        license_number: "D01-12-345686",
        contact_number: "09171234575",
        status: "active",
      },
    ]);

    console.log(`✅ Created ${drivers.length} drivers`);

    const [
      driver1,
      driver2,
      driver3,
      driver4,
      driver5,
      driver6,
      driver7,
      driver8,
      driver9,
    ] = drivers;

    // ==========================================
    // 7. CREATE USER SUBSCRIPTIONS
    // ==========================================
    const subscriptions = await UserSubscription.insertMany([
      // User1 (Ana) - subscribes to Route 01A and Bus CEB-001
      { user_id: user1._id, route_id: route01A._id, bus_id: null },
      { user_id: user1._id, route_id: null, bus_id: bus1._id },

      // User2 (Carlos) - subscribes to Route 02B and Route 03C
      { user_id: user2._id, route_id: route02B._id, bus_id: null },
      { user_id: user2._id, route_id: route03C._id, bus_id: null },

      // User3 (Lisa) - subscribes to Bus CEB-002 and Route 04D
      { user_id: user3._id, route_id: route04D._id, bus_id: null },
      { user_id: user3._id, route_id: null, bus_id: bus2._id },

      // User4 (Mark) - subscribes to Route 01A and Bus CEB-003
      { user_id: user4._id, route_id: route01A._id, bus_id: null },
      { user_id: user4._id, route_id: null, bus_id: bus3._id },

      // User5 (Sofia) - subscribes to Route 05E and multiple buses
      { user_id: user5._id, route_id: route05E._id, bus_id: null },
      { user_id: user5._id, route_id: null, bus_id: bus1._id },
      { user_id: user5._id, route_id: null, bus_id: bus4._id },

      // Some users subscribe to same routes (for testing broadcast)
      { user_id: user1._id, route_id: route03C._id, bus_id: null },
      { user_id: user3._id, route_id: route01A._id, bus_id: null },

      { user_id: user6._id, route_id: route06F._id, bus_id: null },
      { user_id: user6._id, route_id: null, bus_id: bus11._id },
      { user_id: user7._id, route_id: route07G._id, bus_id: null },
      { user_id: user7._id, route_id: null, bus_id: bus9._id },
      { user_id: user8._id, route_id: route04D._id, bus_id: null },
    ]);

    console.log(`✅ Created ${subscriptions.length} user subscriptions`);

    // ==========================================
    // 8. CREATE BUS ASSIGNMENTS
    // ==========================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignments = await BusAssignment.insertMany([
      {
        bus_id: bus1._id,
        driver_id: driver1._id,
        operator_user_id: operator1._id,
        route_id: route01A._id,
        assignment_date: today,
        scheduled_departure_time: new Date(
          today.getTime() + 8 * 60 * 60 * 1000,
        ), // 8:00 AM
        scheduled_arrival_time: new Date(
          today.getTime() + 8.75 * 60 * 60 * 1000,
        ), // 8:45 AM
        status: "active",
        actual_departure_time: new Date(today.getTime() + 8.1 * 60 * 60 * 1000), // 8:06 AM (6 min delay)
        total_stops: 5,
        stops_completed: 3,
        is_delayed: true,
        departure_delay_minutes: 6,
      },
      {
        bus_id: bus2._id,
        driver_id: driver2._id,
        operator_user_id: operator1._id,
        route_id: route02B._id,
        assignment_date: today,
        scheduled_departure_time: new Date(
          today.getTime() + 9 * 60 * 60 * 1000,
        ), // 9:00 AM
        scheduled_arrival_time: new Date(
          today.getTime() + 9.5 * 60 * 60 * 1000,
        ), // 9:30 AM
        status: "scheduled",
        total_stops: 5,
        stops_completed: 0,
      },
      {
        bus_id: bus3._id,
        driver_id: driver3._id,
        operator_user_id: operator2._id,
        route_id: route03C._id,
        assignment_date: today,
        scheduled_departure_time: new Date(
          today.getTime() + 7 * 60 * 60 * 1000,
        ), // 7:00 AM
        scheduled_arrival_time: new Date(
          today.getTime() + 7.58 * 60 * 60 * 1000,
        ), // 7:35 AM
        status: "completed",
        actual_departure_time: new Date(today.getTime() + 7 * 60 * 60 * 1000),
        actual_arrival_time: new Date(today.getTime() + 7.62 * 60 * 60 * 1000), // 7:37 AM (2 min delay)
        completed_at: new Date(today.getTime() + 7.62 * 60 * 60 * 1000),
        total_stops: 4,
        stops_completed: 4,
        total_duration_minutes: 37,
        arrival_delay_minutes: 2,
      },
      {
        bus_id: bus4._id,
        driver_id: driver4._id,
        operator_user_id: operator1._id,
        route_id: route04D._id,
        assignment_date: today,
        scheduled_departure_time: new Date(
          today.getTime() + 10 * 60 * 60 * 1000,
        ), // 10:00 AM
        scheduled_arrival_time: new Date(
          today.getTime() + 10.42 * 60 * 60 * 1000,
        ), // 10:25 AM
        status: "arrival_pending",
        actual_departure_time: new Date(today.getTime() + 10 * 60 * 60 * 1000),
        total_stops: 4,
        stops_completed: 3,
      },
      {
        bus_id: bus6._id,
        driver_id: driver5._id,
        operator_user_id: operator2._id,
        route_id: route05E._id,
        assignment_date: today,
        scheduled_departure_time: new Date(
          today.getTime() + 11 * 60 * 60 * 1000,
        ), // 11:00 AM
        scheduled_arrival_time: new Date(
          today.getTime() + 11.67 * 60 * 60 * 1000,
        ), // 11:40 AM
        status: "scheduled",
        total_stops: 4,
        stops_completed: 0,
      },
      {
        bus_id: bus11._id,
        driver_id: driver8._id,
        operator_user_id: operator1._id,
        route_id: route06F._id,
        assignment_date: today,
        scheduled_departure_time: new Date(
          today.getTime() + 12 * 60 * 60 * 1000,
        ),
        scheduled_arrival_time: new Date(
          today.getTime() + 12.83 * 60 * 60 * 1000,
        ),
        status: "scheduled",
        total_stops: 4,
        stops_completed: 0,
      },
      {
        bus_id: bus12._id,
        driver_id: driver9._id,
        operator_user_id: operator2._id,
        route_id: route07G._id,
        assignment_date: today,
        scheduled_departure_time: new Date(
          today.getTime() + 6.5 * 60 * 60 * 1000,
        ),
        scheduled_arrival_time: new Date(
          today.getTime() + 6.83 * 60 * 60 * 1000,
        ),
        status: "active",
        actual_departure_time: new Date(
          today.getTime() + 6.52 * 60 * 60 * 1000,
        ),
        total_stops: 4,
        stops_completed: 2,
        is_delayed: true,
        departure_delay_minutes: 2,
      },
      {
        bus_id: bus9._id,
        driver_id: driver6._id,
        operator_user_id: operator1._id,
        route_id: route02B._id,
        assignment_date: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        scheduled_departure_time: new Date(
          today.getTime() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000,
        ),
        scheduled_arrival_time: new Date(
          today.getTime() + 24 * 60 * 60 * 1000 + 14.5 * 60 * 60 * 1000,
        ),
        status: "scheduled",
        total_stops: 5,
        stops_completed: 0,
      },
    ]);

    console.log(`✅ Created ${assignments.length} bus assignments`);

    const [
      assignment1,
      assignment2,
      assignment3,
      assignment4,
      assignment5,
      assignment6,
      assignment7,
      assignment8,
    ] = assignments;

    // ==========================================
    // 9. CREATE NOTIFICATIONS
    // ==========================================
    const now = new Date();

    const notifications = await Notification.insertMany([
      // 1. System-wide announcement
      {
        sender_id: superAdmin._id,
        bus_id: null,
        route_id: null,
        terminal_id: null,
        title: "System Maintenance Notice",
        message:
          "The bus tracking system will undergo maintenance on March 31, 2026 from 2:00 AM to 4:00 AM. Real-time tracking may be temporarily unavailable.",
        notification_type: "info",
        priority: "high",
        scope: "system",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      },

      // 2. Bus delay notification (for bus CEB-001)
      {
        sender_id: operator1._id,
        bus_id: bus1._id,
        route_id: route01A._id,
        terminal_id: null,
        title: "Bus CEB-001 Delayed",
        message:
          "Bus CEB-001 on Route 01A (SM to Ayala) is running 6 minutes behind schedule due to heavy traffic on Mango Avenue.",
        notification_type: "delay",
        priority: "medium",
        scope: "bus",
        createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
      },

      // 3. Bus full notification
      {
        sender_id: operator1._id,
        bus_id: bus1._id,
        route_id: route01A._id,
        terminal_id: null,
        title: "Bus CEB-001 at Full Capacity",
        message:
          "Bus CEB-001 is currently at full capacity (50/50 passengers). Please wait for the next bus or consider alternative routes.",
        notification_type: "full",
        priority: "medium",
        scope: "bus",
        createdAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
      },

      // 4. Route-wide notification
      {
        sender_id: operator2._id,
        bus_id: null,
        route_id: route02B._id,
        terminal_id: null,
        title: "Route 02B Service Update",
        message:
          "Additional buses have been deployed on Route 02B (Carbon to Mandaue) due to high demand during rush hour.",
        notification_type: "info",
        priority: "low",
        scope: "route",
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      },

      // 5. Skipped stop notification
      {
        sender_id: operator1._id,
        bus_id: bus1._id,
        route_id: route01A._id,
        terminal_id: null,
        title: "Stop Skipped - Mango Square",
        message:
          "Bus CEB-001 has skipped Mango Square stop due to road construction. The bus will resume normal stops at Capitol Site.",
        notification_type: "skipped_stop",
        priority: "high",
        scope: "bus",
        createdAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
      },

      // 6. Terminal notification
      {
        sender_id: terminalAdmin1._id,
        bus_id: null,
        route_id: null,
        terminal_id: smTerminal._id,
        title: "SM Terminal Parking Update",
        message:
          "Bay 3 and Bay 4 at SM Terminal are temporarily closed for repairs. Buses will use alternative bays.",
        notification_type: "info",
        priority: "medium",
        scope: "terminal",
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      },

      // 7. Another bus delay (for subscribed users)
      {
        sender_id: operator2._id,
        bus_id: bus3._id,
        route_id: route03C._id,
        terminal_id: null,
        title: "Bus CEB-003 Minor Delay",
        message:
          "Bus CEB-003 on Route 03C (IT Park to SM) experienced a 2-minute delay but has now completed its trip.",
        notification_type: "delay",
        priority: "low",
        scope: "bus",
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      },

      // 8. Route maintenance
      {
        sender_id: superAdmin._id,
        bus_id: null,
        route_id: route05E._id,
        terminal_id: null,
        title: "Route 05E Schedule Change",
        message:
          "Starting April 1, 2026, Route 05E will have updated departure times. First bus at 6:00 AM, last bus at 10:00 PM.",
        notification_type: "info",
        priority: "high",
        scope: "route",
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      },

      // 9. Bus back in service
      {
        sender_id: operator1._id,
        bus_id: bus5._id,
        route_id: null,
        terminal_id: null,
        title: "Bus CEB-005 Maintenance Complete",
        message:
          "Bus CEB-005 has completed scheduled maintenance and will resume service tomorrow morning.",
        notification_type: "info",
        priority: "low",
        scope: "bus",
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      },

      // 10. Terminal congestion
      {
        sender_id: terminalAdmin2._id,
        bus_id: null,
        route_id: null,
        terminal_id: ayalaTerminal._id,
        title: "Ayala Terminal High Traffic",
        message:
          "Ayala Terminal is experiencing higher than usual foot traffic. Please allow extra time for boarding.",
        notification_type: "info",
        priority: "medium",
        scope: "terminal",
        createdAt: new Date(now.getTime() - 20 * 60 * 1000), // 20 minutes ago
      },

      {
        sender_id: superAdmin._id,
        bus_id: null,
        route_id: null,
        terminal_id: null,
        title: "Peak Season Travel Advisory",
        message:
          "Expect heavier passenger volume on provincial and mall-linked routes this weekend. Arrive at terminals at least 15 minutes before departure.",
        notification_type: "info",
        priority: "medium",
        scope: "system",
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },

      {
        sender_id: operator1._id,
        bus_id: null,
        route_id: route06F._id,
        terminal_id: null,
        title: "Route 06F Extra Morning Trip",
        message:
          "An additional southbound trip on Route 06F (South Bus to SM) departs at 5:45 AM on weekdays until further notice.",
        notification_type: "info",
        priority: "medium",
        scope: "route",
        createdAt: new Date(now.getTime() - 90 * 60 * 1000),
      },

      {
        sender_id: operator1._id,
        bus_id: bus9._id,
        route_id: route02B._id,
        terminal_id: null,
        title: "Bus CEB-009 On Schedule",
        message:
          "Bus CEB-009 on Route 02B is on time for tomorrow's 2:00 PM departure from Carbon Market Terminal.",
        notification_type: "info",
        priority: "low",
        scope: "bus",
        createdAt: new Date(now.getTime() - 10 * 60 * 1000),
      },
    ]);

    console.log(`✅ Created ${notifications.length} notifications`);

    const [
      notif1,
      notif2,
      notif3,
      notif4,
      notif5,
      notif6,
      notif7,
      notif8,
      notif9,
      notif10,
      notif11,
      notif12,
      notif13,
    ] = notifications;

    // ==========================================
    // 10. CREATE USER NOTIFICATIONS
    // ==========================================
    const userNotifications = await UserNotification.insertMany([
      // User1 (Ana) - subscribed to Route 01A and Bus CEB-001
      {
        user_id: user1._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
      },
      { user_id: user1._id, notification_id: notif2._id, is_read: false }, // Bus CEB-001 delay
      { user_id: user1._id, notification_id: notif3._id, is_read: false }, // Bus CEB-001 full
      {
        user_id: user1._id,
        notification_id: notif5._id,
        is_read: true,
        read_at: new Date(now.getTime() - 40 * 60 * 1000),
      }, // Bus CEB-001 skip
      { user_id: user1._id, notification_id: notif7._id, is_read: false }, // Route 03C (also subscribed)

      // User2 (Carlos) - subscribed to Route 02B and Route 03C
      { user_id: user2._id, notification_id: notif1._id, is_read: false },
      {
        user_id: user2._id,
        notification_id: notif4._id,
        is_read: true,
        read_at: new Date(now.getTime() - 50 * 60 * 1000),
      }, // Route 02B
      { user_id: user2._id, notification_id: notif7._id, is_read: false }, // Route 03C

      // User3 (Lisa) - subscribed to Route 04D and Bus CEB-002
      {
        user_id: user3._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
      { user_id: user3._id, notification_id: notif2._id, is_read: false }, // Also subscribed to Route 01A
      { user_id: user3._id, notification_id: notif3._id, is_read: false },
      { user_id: user3._id, notification_id: notif5._id, is_read: false },

      // User4 (Mark) - subscribed to Route 01A and Bus CEB-003
      { user_id: user4._id, notification_id: notif1._id, is_read: false },
      {
        user_id: user4._id,
        notification_id: notif2._id,
        is_read: true,
        read_at: new Date(now.getTime() - 25 * 60 * 1000),
      },
      { user_id: user4._id, notification_id: notif3._id, is_read: false },
      { user_id: user4._id, notification_id: notif5._id, is_read: false },
      {
        user_id: user4._id,
        notification_id: notif7._id,
        is_read: true,
        read_at: new Date(now.getTime() - 3.5 * 60 * 60 * 1000),
      }, // Bus CEB-003

      // User5 (Sofia) - subscribed to Route 05E and Buses CEB-001, CEB-004
      {
        user_id: user5._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1.8 * 60 * 60 * 1000),
      },
      { user_id: user5._id, notification_id: notif2._id, is_read: false }, // Bus CEB-001
      { user_id: user5._id, notification_id: notif3._id, is_read: false }, // Bus CEB-001
      { user_id: user5._id, notification_id: notif5._id, is_read: false }, // Bus CEB-001
      {
        user_id: user5._id,
        notification_id: notif8._id,
        is_read: true,
        read_at: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      }, // Route 05E

      // Operators and admins get all system notifications
      {
        user_id: operator1._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1.9 * 60 * 60 * 1000),
      },
      {
        user_id: operator1._id,
        notification_id: notif6._id,
        is_read: true,
        read_at: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      },
      { user_id: operator1._id, notification_id: notif10._id, is_read: false },

      {
        user_id: operator2._id,
        notification_id: notif1._id,
        is_read: true,
        read_at: new Date(now.getTime() - 1.7 * 60 * 60 * 1000),
      },
      {
        user_id: operator2._id,
        notification_id: notif4._id,
        is_read: true,
        read_at: new Date(now.getTime() - 55 * 60 * 1000),
      },

      {
        user_id: terminalAdmin1._id,
        notification_id: notif1._id,
        is_read: false,
      },
      {
        user_id: terminalAdmin1._id,
        notification_id: notif6._id,
        is_read: true,
        read_at: new Date(now.getTime() - 2.8 * 60 * 60 * 1000),
      },

      {
        user_id: terminalAdmin2._id,
        notification_id: notif1._id,
        is_read: false,
      },
      {
        user_id: terminalAdmin2._id,
        notification_id: notif10._id,
        is_read: true,
        read_at: new Date(now.getTime() - 15 * 60 * 1000),
      },

      {
        user_id: superAdmin._id,
        notification_id: notif2._id,
        is_read: true,
        read_at: new Date(now.getTime() - 28 * 60 * 1000),
      },
      {
        user_id: superAdmin._id,
        notification_id: notif3._id,
        is_read: true,
        read_at: new Date(now.getTime() - 12 * 60 * 1000),
      },
      {
        user_id: superAdmin._id,
        notification_id: notif5._id,
        is_read: true,
        read_at: new Date(now.getTime() - 42 * 60 * 1000),
      },

      { user_id: user6._id, notification_id: notif1._id, is_read: false },
      { user_id: user6._id, notification_id: notif11._id, is_read: false },
      { user_id: user6._id, notification_id: notif12._id, is_read: false },

      {
        user_id: user7._id,
        notification_id: notif11._id,
        is_read: true,
        read_at: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      { user_id: user7._id, notification_id: notif13._id, is_read: false },
      { user_id: user7._id, notification_id: notif1._id, is_read: false },

      { user_id: user8._id, notification_id: notif1._id, is_read: false },
      { user_id: user8._id, notification_id: notif8._id, is_read: false },

      {
        user_id: operator1._id,
        notification_id: notif12._id,
        is_read: true,
        read_at: new Date(now.getTime() - 85 * 60 * 1000),
      },
      { user_id: operator1._id, notification_id: notif13._id, is_read: false },
    ]);

    console.log(`✅ Created ${userNotifications.length} user notifications`);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log("\n📊 SEED DATA SUMMARY:");
    console.log("=====================");
    console.log(`Users: ${users.length}`);
    console.log(`  - Super Admin: 1`);
    console.log(`  - Operators: 2`);
    console.log(`  - Terminal Admins: 2`);
    console.log(`  - Regular Users: 8`);
    console.log(`Terminals: ${terminals.length}`);
    console.log(`Routes: ${routes.length}`);
    console.log(`Route Stops: ${routeStops.length}`);
    console.log(`Buses: ${buses.length}`);
    console.log(`Drivers: ${drivers.length}`);
    console.log(`Bus Assignments: ${assignments.length}`);
    console.log(`Notifications: ${notifications.length}`);
    console.log(`  - Scope system: 2`);
    console.log(`  - Type delay: 2, full: 1, skipped_stop: 1, info: 9`);
    console.log(`User Subscriptions: ${subscriptions.length}`);
    console.log(`User Notifications: ${userNotifications.length}`);

    console.log("\n✅ Seed data created successfully!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
};

// Execute if run directly
const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (isDirectRun) {
  if (!process.env.MONGO_DB_URI) {
    console.error(
      "❌ Missing MONGO_DB_URI. Ensure server/.env exists and is loaded.",
    );
    process.exit(1);
  }

  mongoose
    .connect(process.env.MONGO_DB_URI)
    .then(() => {
      console.log("📦 Connected to MongoDB");
      return seedData();
    })
    .then(() => {
      console.log("🎉 Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}

export default seedData;
