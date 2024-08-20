import mongoose from "mongoose";
import config from "./app/config";
import { server } from "./module/socket/socket";

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    server.listen(config.port, () => {
      console.log(`Artiqy system listening on port ${config.port}`);
    });
  } catch (err) {
    console.log(err);
  }
}
main();
