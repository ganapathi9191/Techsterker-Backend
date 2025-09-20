// utils/invoiceTemplate.js
const mongoose = require("mongoose");

async function cleanupLegacyIndexes() {
  try {
    const collection = mongoose.connection.collection("invoices");

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log("Existing indexes:", indexes);

    // Drop the legacy invoiceId index if it exists
    if (indexes.some(index => index.name === "invoiceId_1")) {
      await collection.dropIndex("invoiceId_1");
      console.log("🗑️ Dropped legacy index: invoiceId_1");
    } else {
      console.log("✅ No legacy invoiceId_1 index found");
    }
  } catch (err) {
    console.error("Error cleaning up legacy indexes:", err);
  }
}

module.exports = cleanupLegacyIndexes;
