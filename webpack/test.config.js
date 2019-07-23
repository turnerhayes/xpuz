const createConfig = require("./common.config");

module.exports = createConfig({
	entry: [
		"./src/index.ts",
		"./src/immutable/index.ts",
	],
	filename: "xpuz.js",
});
