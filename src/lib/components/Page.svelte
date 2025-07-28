<script lang="ts">
	import type { NostrEvent } from 'nostr-tools/pure';
	import { SimplePool } from 'nostr-tools/pool';
	import type { Filter } from 'nostr-tools/filter';
	import { normalizeURL } from 'nostr-tools/utils';
	import * as nip19 from 'nostr-tools/nip19';
	import { defaultUploaderURLs, defaultRelaysForProfile, linkGitHub } from '$lib/config';
	import Upload from '$lib/components/Upload.svelte';
	import Delete from '$lib/components/Delete.svelte';
	import List from '$lib/components/List.svelte';

	let npub: string = $state('');
	let uploaderURLs = $state(defaultUploaderURLs);
	let fileHashToDelete: string = $state('');

	const setUploaderURLs = async (): Promise<void> => {
		const serverList = await getServerList();
		if (serverList.length > 0) {
			uploaderURLs = serverList;
		} else {
			uploaderURLs = defaultUploaderURLs;
		}
	};

	const getNpubWithNIP07 = async (): Promise<void> => {
		const nostr = window.nostr;
		let pubkey: string | undefined;
		if (nostr?.getPublicKey) {
			try {
				pubkey = await nostr.getPublicKey();
			} catch (error) {
				console.error(error);
				return;
			}
			npub = nip19.npubEncode(pubkey);
		}
		await setUploaderURLs();
	};

	const getReplaceableEvent = (
		pool: SimplePool,
		relays: string[],
		filter: Filter
	): Promise<NostrEvent | undefined> => {
		return new Promise((resolve) => {
			let event: NostrEvent | undefined;
			const sub = pool.subscribe(relays, filter, {
				onevent(ev) {
					if (event === undefined || event.created_at < ev.created_at) {
						event = ev;
					}
				},
				oneose() {
					sub.close();
					resolve(event);
				}
			});
		});
	};

	const getServerList = async (): Promise<string[]> => {
		if (npub.length === 0) {
			return [];
		}
		let dr: nip19.DecodedResult;
		try {
			dr = nip19.decode(npub);
		} catch (error) {
			console.error(error);
			return [];
		}
		let pubkey: string;
		const profileRelays: string[] = [];
		if (dr.type === 'npub') {
			pubkey = dr.data;
		} else if (dr.type === 'nprofile') {
			pubkey = dr.data.pubkey;
			for (const relay of dr.data.relays ?? []) {
				profileRelays.push(normalizeURL(relay));
			}
		} else {
			console.error(`${npub} is not npub/nprofile`);
			return [];
		}
		const now = Math.floor(Date.now() / 1000);
		const targetPubkey = pubkey;
		const pool = new SimplePool();
		const ev10002: NostrEvent | undefined = await getReplaceableEvent(
			pool,
			Array.from(new Set<string>([...defaultRelaysForProfile, ...profileRelays])),
			{
				kinds: [10002],
				authors: [targetPubkey],
				until: now
			}
		);
		const relaySetToRead = new Set<string>();
		if (ev10002 !== undefined) {
			for (const tag of ev10002.tags.filter(
				(tag) => tag.length >= 2 && tag[0] === 'r' && URL.canParse(tag[1])
			)) {
				if (tag.length === 2 || tag[2] === 'read') {
					relaySetToRead.add(normalizeURL(tag[1]));
				}
			}
		}
		for (const relay of profileRelays) {
			relaySetToRead.add(relay);
		}
		const ev10063: NostrEvent | undefined = await getReplaceableEvent(
			pool,
			Array.from(relaySetToRead),
			{
				kinds: [10063],
				authors: [targetPubkey],
				until: now
			}
		);
		if (ev10063 === undefined) {
			console.warn('kind:10063 event is undefined');
			return [];
		}
		const serverList: string[] = [];
		for (const tag of ev10063.tags.filter(
			(tag) => tag.length >= 2 && tag[0] === 'server' && URL.canParse(tag[1])
		)) {
			serverList.push(tag[1]);
		}
		return serverList;
	};
</script>

<svelte:head>
	<title>Nostr Learn Blossom</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/dark.css" />
</svelte:head>

<header>
	<h1>
		Nostr Learn <a
			href="https://github.com/hzrd149/blossom"
			target="_blank"
			rel="noopener noreferrer">Blossom</a
		>
	</h1>
</header>
<main>
	<fieldset id="field-settings">
		<legend>Settings (optional)</legend>
		<button id="get-settings" onclick={getNpubWithNIP07}>NIP-07</button>
		<label for="get-settings">for the kind 10063 event</label>
		<input
			id="npub"
			type="text"
			placeholder="npub1... or nprofile1..."
			bind:value={npub}
			onchange={setUploaderURLs}
		/>
	</fieldset>
	<input type="radio" name="tab-item" id="tab-upload" checked />
	<label class="tab-item" for="tab-upload">Upload</label>
	<input type="radio" name="tab-item" id="tab-delete" />
	<label class="tab-item" for="tab-delete">Delete</label>
	<input type="radio" name="tab-item" id="tab-list" />
	<label class="tab-item" for="tab-list">List</label>
	<Upload {uploaderURLs} targetUrlToUpload={uploaderURLs[0]} />
	<Delete {uploaderURLs} targetUrlToDelete={uploaderURLs[0]} {fileHashToDelete} />
	<List {uploaderURLs} targetUrlToList={uploaderURLs[0]} bind:fileHashToDelete />
</main>
<footer>
	<a href={linkGitHub} target="_blank" rel="noopener noreferrer">GitHub</a>
</footer>

<style>
	.tab-item {
		width: calc(100% / 3);
		height: 3em;
		background-color: rgba(255, 255, 255, 0.25);
		line-height: 3em;
		text-align: center;
		display: block;
		float: left;
		font-weight: bold;
		transition: all 0.2s ease;
		border-radius: 3em;
	}
	input:not(:checked) + .tab-item:hover {
		opacity: 0.5;
		cursor: pointer;
	}
	input[name='tab-item'] {
		display: none;
	}
	:global(.tab-content) {
		display: none;
		clear: both;
		overflow: hidden;
	}
	:global(
		#tab-upload:checked ~ #field-upload,
		#tab-delete:checked ~ #field-delete,
		#tab-list:checked ~ #field-list
	) {
		display: block;
	}
	input:checked + .tab-item {
		background-color: rgba(0, 0, 0, 0.25);
	}
	:global(details) {
		overflow-x: auto;
	}
	:global(summary) {
		width: 100%;
	}
	:global(fieldset) {
		min-width: 0;
	}
	:global(fieldset input[type='text']),
	#npub {
		width: calc(100% - 1.5em);
	}
	:global(fieldset input[type='file']) {
		max-width: calc(100% - 40px);
	}
	footer {
		text-align: center;
	}
</style>
