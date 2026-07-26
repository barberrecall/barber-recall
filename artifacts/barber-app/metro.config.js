// Metro config for a pnpm workspace.
//
// Two things are needed beyond the Expo defaults:
//   1. The shared packages in lib/ live outside this package, so their folders
//      must be watched for Metro to see them at all.
//   2. `nodeModulesPaths` must include the root store, because pnpm hoists
//      shared dependencies there rather than into artifacts/barber-app.
//
// Hierarchical lookup is deliberately left enabled: pnpm resolves packages
// through symlinks, and disabling it (as the non-pnpm monorepo guides suggest)
// breaks that resolution.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..", "..");

const config = getDefaultConfig(projectRoot);

// Watch only what this app actually consumes, not the whole repo. Metro's
// watcher init timeout is a hard-coded 4 minutes (metro-file-map's
// MAX_WAIT_TIME), and crawling the entire workspace — the web app's own
// node_modules, attached_assets, api-server build output — blew past it on a
// OneDrive-synced folder. Narrowing the roots keeps startup under the limit.
config.watchFolders = [
  path.resolve(workspaceRoot, "lib"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Sibling artifacts are never imported by the app; keeping them out of the file
// map avoids crawling two more full React projects.
config.resolver.blockList = [
  /[\\/]artifacts[\\/]barber-crm[\\/].*/,
  /[\\/]artifacts[\\/]mockup-sandbox[\\/].*/,
  /[\\/]artifacts[\\/]api-server[\\/]dist[\\/].*/,
  /[\\/]attached_assets[\\/].*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
