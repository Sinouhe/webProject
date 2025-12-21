/* Need Node.js 24.3+ */
import { type Config } from 'prettier';

const config: Config = {
	semi: true,
	trailingComma: 'es5',
	singleQuote: true,
	printWidth: 100,
	tabWidth: 4,
	useTabs: true,
	overrides: [
		{
			// Prettier doesn't support Go templates
			files: [
				'**/helms/**/*.yaml',
				'**/helms/**/*.yml',
				'**/templates/**/*.yaml',
				'**/templates/**/*.yml',
			],
			options: {
				parser: 'yaml',
				requirePragma: true, // Add @prettier or @format to format .yaml files
			},
		},
	],
};

export default config;
