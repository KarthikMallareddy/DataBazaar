// Suppress known lit-html dev-mode console warning during local dev runs.
// lit-html checks `global.litIssuedWarnings` before issuing repetitive warnings.
if (typeof window !== 'undefined') {
	window.litIssuedWarnings = window.litIssuedWarnings || new Set();
	window.litIssuedWarnings.add(
		'Lit is in dev mode. Not recommended for production! See https://lit.dev/msg/dev-mode for more information.'
	);
}

import App from './App';
import './index.scss';

const app = new App();
