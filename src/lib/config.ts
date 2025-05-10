import type { WindowNostr } from 'nostr-tools/nip07';

export const linkGitHub = 'https://github.com/nikolat/nostr-learn-blossom';

export const defaultUploaderURLs = [
	'https://blossom.band',
	'https://cdn.nostrcheck.me',
	'https://nostr.download',
	'https://blossom.primal.net',
	'https://cdn.satellite.earth'
];

export const defaultRelaysForProfile = ['wss://directory.yabu.me/'];

declare global {
	interface Window {
		nostr?: WindowNostr;
	}
}
