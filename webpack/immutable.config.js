const createConfig = require("./common.config");

module.exports = createConfig({
	entry: "./src/index.js",
	filename: "xpuz.immutable.js",
	externals: {
		immutable: "Immutable",
	},
});
