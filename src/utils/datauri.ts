import DataUriParser from "datauri/parser.js";
import path from "path";

// Define the type for the file object
interface File {
  buffer: Buffer;
  originalname: string; // Ensure this is a string
}

const parser = new DataUriParser();

// Function to get the data URI from a file object
const getDataUri = (file: File): string => {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error("Invalid file object provided.");
  }

  // Ensure originalname is a string
  const originalName = file.originalname;
  if (typeof originalName !== "string") {
    throw new Error("File name must be a string.");
  }

  const extName = path.extname(originalName); // extName will be a string

  // Format the data URI
  const dataUri = parser.format(extName, file.buffer).content;

  if (typeof dataUri !== "string") {
    throw new Error("Failed to generate data URI.");
  }

  return dataUri;
};

export default getDataUri;
