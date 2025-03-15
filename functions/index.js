/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// Add a function to get tasks for the Quest Board app
exports.getTasks = onRequest({
  cors: true,
  maxInstances: 10,
}, async (request, response) => {
  try {
    logger.info("Fetching tasks from Firestore");
    
    const db = admin.firestore();
    const tasksRef = db.collection("tasks");
    const snapshot = await tasksRef.get();
    
    const tasks = [];
    snapshot.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    response.status(200).json(tasks);
  } catch (error) {
    logger.error("Error fetching tasks:", error);
    response.status(500).json({error: "Failed to fetch tasks"});
  }
});
