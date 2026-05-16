const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-camera installs zxing-wasm which creates temporary directories
// that Metro tries to watch but which disappear immediately, causing ENOENT crashes.
// Block these temp paths from being watched.
config.resolver = config.resolver ?? {};
config.resolver.blockList = [
  /zxing-wasm_tmp_.*/,
  /node_modules\/.*\/zxing-wasm_tmp_.*/,
  // Sentry's replay package writes/removes tmp dirs that crash Metro's watcher.
  /replay_tmp_.*/,
  /node_modules\/.*\/replay_tmp_.*/,
];

// Also increase the watcher timeout to handle slow installs
config.watcher = config.watcher ?? {};
config.watcher.healthCheck = {
  enabled: true,
  interval: 30000,
  timeout: 10000,
};

module.exports = config;
