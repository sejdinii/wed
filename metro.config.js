const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// zustand v5's ESM entry ("import" export condition) uses `import.meta`, which
// Metro's classic-script web bundle cannot evaluate — the app dies on boot with
// "SyntaxError: Cannot use 'import.meta' outside a module". Expo's resolver
// asserts the "import" condition itself, so pin zustand (and only zustand) to
// its CJS files directly.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    const sub = moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
    const filePath = path.join(__dirname, 'node_modules', 'zustand', `${sub}.js`);
    if (fs.existsSync(filePath)) {
      return { type: 'sourceFile', filePath };
    }
  }
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  return resolve(context, moduleName, platform);
};

module.exports = config;
