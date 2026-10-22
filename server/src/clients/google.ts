import { Storage } from "@google-cloud/storage";
import { googleConfig } from "@/config";

const storage = new Storage();
const bucket = storage.bucket(googleConfig.bucket);

export { bucket };