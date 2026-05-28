import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODE = process.env.mode;

export default {
    input: MODE === "view-test"? 'src/view-index.ts': 'src/index.ts', // your entry point
    output: {
    file: MODE === "view-test"? './dist/test-bundle.js' : '/home/alex/Documents/Schemes of dead Gods/Scripts/bundle.js',
        format: MODE === "view-test"? 'esm' : 'cjs', // Node = CommonJS (or 'esm' if you prefer)
        sourcemap: true,
    },
    external: [
        // keep built-ins and deps external if desired
        // e.g. 'fs', 'path', or Object.keys(pkg.dependencies || {})
    ],
    plugins: [
        alias({
            entries: [{
                find: '@',
                replacement: path.resolve(__dirname, 'src'),
            }],
        }),
        resolve({
            extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
        }),
        commonjs(),
        json(),
        typescript({
            tsconfig: './tsconfig.json',
            exclude: ["tests/**", "**/*.test.ts"]
        }),
        // terser(),
    ],
};