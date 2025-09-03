const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendarController");

// CRUD Routes
router.post("/calendar", calendarController.createCalendarEntry);
router.get("/calendars", calendarController.getAllCalendarEntries);
router.get("/calendar/:id", calendarController.getCalendarById);
router.put("/calendar/:id", calendarController.updateCalendarById);
router.delete("/calendar/:id", calendarController.deleteCalendarById);

module.exports = router;
