// Vercel serverless entry point. The Express app is built by `npm --prefix server run build`
// (see vercel.json's buildCommand) and re-exported here as the request handler.
export { default } from "../server/dist/app.js";
