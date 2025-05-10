<script lang="ts">
	import type { EventTemplate } from 'nostr-tools/pure';
	import { BlossomClient } from 'blossom-client-sdk/client';
	import type { BlobDescriptor } from 'blossom-client-sdk';

	let {
		uploaderURLs,
		targetUrlToList,
		fileHashToDelete = $bindable()
	}: {
		uploaderURLs: string[];
		targetUrlToList: string;
		fileHashToDelete: string;
	} = $props();
	let fileListResponse: BlobDescriptor[] | undefined = $state();
	let isInProcess: boolean = $state(false);

	const listFilesExec = async () => {
		const nostr = window.nostr;
		if (nostr === undefined) {
			return;
		}
		const signer = async (e: EventTemplate) => {
			return await nostr.signEvent(e);
		};
		isInProcess = true;
		console.info('file listing...');
		try {
			const pubkey = await nostr.getPublicKey();
			const auth = await BlossomClient.createListAuth(signer);
			fileListResponse = await BlossomClient.listBlobs(targetUrlToList, pubkey, {
				auth
			});
		} catch (error) {
			console.error(error);
			isInProcess = false;
			return;
		}
		console.info('file listing complete');
		isInProcess = false;
	};

	const goToDeleteTab = (ox: string | undefined): void => {
		if (ox === undefined) return;
		const tab = document.getElementById('tab-delete') as HTMLInputElement;
		tab.checked = true;
		tab.click();
		const uploader = document.getElementById('uploader-url-to-delete') as HTMLSelectElement;
		uploader.value = (document.getElementById('uploader-url-to-list') as HTMLSelectElement).value;
		fileHashToDelete = ox;
	};
</script>

<fieldset class="tab-content" id="field-list">
	<legend>List</legend>
	<dl>
		<dt><label for="uploader-url-to-list">Target URL</label></dt>
		<dd>
			<select id="uploader-url-to-list" bind:value={targetUrlToList}>
				{#each uploaderURLs as url (url)}
					<option value={url}>{url}</option>
				{/each}
			</select>
		</dd>
		<dt>
			<label for="show-list">Show List</label> (required
			<a
				href="https://github.com/nostr-protocol/nips/blob/master/07.md"
				target="_blank"
				rel="noopener noreferrer">NIP-07</a
			> extension)
		</dt>
		<dd>
			<button id="show-list" onclick={listFilesExec} disabled={isInProcess}>Show List</button>
		</dd>
		<dt>Result</dt>
		<dd class="list">
			{#if fileListResponse !== undefined}
				{#each fileListResponse as file, i (i)}
					{@const url = file.url}
					{@const m = file.type}
					{@const ox = file.sha256}
					{#if m !== undefined}
						<span class="file-container">
							{#if /^image/.test(m)}
								<a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" /></a>
							{:else if /^video/.test(m)}
								<video controls preload="metadata">
									<track kind="captions" />
									<source src={url} />
								</video>
							{:else if /^audio/.test(m)}
								<audio controls preload="metadata" src={url}></audio>
							{:else}
								<a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
							{/if}
							<button
								class="delete"
								onclick={() => goToDeleteTab(ox)}
								title="Delete"
								aria-label="Delete"><svg><use xlink:href="./trash.svg#delete"></use></svg></button
							>
						</span>
					{/if}
				{/each}
			{/if}
			<details>
				<summary>Result</summary>
				<pre><code>{JSON.stringify(fileListResponse, undefined, 2) ?? ''}</code></pre>
			</details>
		</dd>
	</dl>
</fieldset>

<style>
	.list img {
		max-width: 24%;
		max-height: 300px;
		vertical-align: top;
	}
	button.delete {
		padding: 0;
		width: 24px;
		height: 24px;
		fill: white;
	}
	button.delete svg {
		width: 24px;
		height: 24px;
	}
	button.delete:active > svg {
		fill: yellow;
	}
	.file-container {
		position: relative;
	}
	.file-container > button.delete {
		position: absolute;
		top: 0;
		right: 0;
	}
</style>
