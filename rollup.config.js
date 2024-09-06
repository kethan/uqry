import terser from '@rollup/plugin-terser';
import bundleSize from 'rollup-plugin-bundle-size';

const resolve = (pkg, input = "src/index", output = "dist/index") => ({
	input: `${input}.js`,
	plugins: [
		bundleSize()
	],
	output: [
		{
			file: `${output}.es.js`,
			format: 'es',
		},
		{
			file: `${output}.js`,
			format: 'cjs',
		},
		{
			file: `${output}.min.js`,
			format: 'iife',
			name: pkg,
			strict: false,
			compact: true,
			plugins: [terser()]
		},
		{
			file: `${output}.umd.js`,
			format: 'umd',
			name: pkg,
			strict: false,
			compact: true,
			plugins: [terser()]
		}
	]
});

export default [
	resolve("uqry"),
	resolve("uqry", "lite/index", "lite/dist/index"),
	resolve("uqry", "full/index", "full/dist/index")
]