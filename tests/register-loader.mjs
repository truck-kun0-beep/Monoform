// Standalone registration of the test loader. Run with:
//   node --import ./tests/register-loader.mjs --test tests/...
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(pathToFileURL("./tests/loader.mjs"));
