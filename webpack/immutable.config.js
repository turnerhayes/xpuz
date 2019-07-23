const createConfig = require("./common.config");

module.exports = createConfig({
	entry: "./src/index.ts",
	filename: "xpuz.immutable.js",
	externals: {
		immutable: "Immutable",
	},
});
