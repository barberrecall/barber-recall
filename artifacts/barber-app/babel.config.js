module.exports = function (api) {
  api.cache(true);

  return {
    // `jsxImportSource: "nativewind"` is what lets className work on RN
    // components. babel-preset-expo (SDK 57) already wires in the
    // react-native-reanimated plugin, so it must not be listed again here.
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
