import mongoose from "mongoose";
import config from "./app/config"; // Ensure this has your DB URL and port
// import { createSocketServer } from "./module/socket/socket";
import app from "./app";
import { createSocketServer } from "./module/socket/socket";

async function main() {
  const { server,getReceiverSocketId,io } = createSocketServer(app)
  try {
    // Connect to MongoDB
    await mongoose.connect(config.database_url as string);
    // console.log("Connected to MongoDB");

    // Start the server only if the database connection is successful
    server.listen(config.port, () => {
      console.log(`Server is listening on port ${config.port}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }
}

main();
