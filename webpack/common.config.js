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
				test: /\.js$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "babel-loader",
					},
					"eslint-loader"
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
		modules: ["src", "node_modules"],
		extensions: [
			".js",
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

