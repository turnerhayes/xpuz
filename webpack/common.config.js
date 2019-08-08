const path = require("path");
const webpack = require("webpack");

const environment = process.env.NODE_ENV || "development";

module.exports = ({
	entry,
	filename,
	...otherConfig
}) => ({
	entry,
	output: {
		path: path.resolve("./dist"),
		filename,
		library: "XPuz",
		libraryTarget: "umd",
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					// "eslint-loader",
					{
						loader: "ts-loader",
						options: {
						},
					},
				],
			},
		],
	},
	plugins: [
		new webpack.EnvironmentPlugin({
			NODE_ENV: environment,
		}),

		new webpack.NamedModulesPlugin(),
	],
	resolve: {
		modules: ["node_modules", "src"],
		extensions: [
			".js",
			".ts",
		],
		mainFields: [
			"browser",
			"jsnext:main",
			"main",
		],
	},
	devtool: "source-map",
	target: "node",
	mode: environment,
	...otherConfig,
});

