<script lang="ts">
	import type { EventTemplate } from 'nostr-tools/pure';
	import { BlossomClient } from 'blossom-client-sdk/client';

	let {
		uploaderURLs,
		targetUrlToDelete,
		fileHashToDelete
	}: { uploaderURLs: string[]; targetUrlToDelete: string; fileHashToDelete: string } = $props();
	let fileDeleteResponse: boolean | undefined = $state();
	let isInProcess: boolean = $state(false);

	const deleteFileExec = async () => {
		fileDeleteResponse = undefined;
		const nostr = window.nostr;
		if (nostr === undefined) {
			return;
		}
		const signer = async (e: EventTemplate) => {
			return await nostr.signEvent(e);
		};
		isInProcess = true;
		console.info('file deleting...');
		try {
			const auth = await BlossomClient.createDeleteAuth(signer, fileHashToDelete);
			fileDeleteResponse = await BlossomClient.deleteBlob(targetUrlToDelete, fileHashToDelete, {
				auth
			});
		} catch (error) {
			console.error(error);
			isInProcess = false;
			return;
		}
		console.info('file deleting complete');
		isInProcess = false;
	};
</script>

<fieldset class="tab-content" id="field-delete">
	<legend>Delete</legend>
	<dl>
		<dt><label for="uploader-url-to-delete">Target URL</label></dt>
		<dd>
			<select id="uploader-url-to-delete" bind:value={targetUrlToDelete}>
				{#each uploaderURLs as url (url)}
					<option value={url}>{url}</option>
				{/each}
			</select>
		</dd>
		<dt>
			<label for="file-hash-to-delete">The SHA-256 hash of the original file</label>
		</dt>
		<dd>
			<input id="file-hash-to-delete" type="text" bind:value={fileHashToDelete} />
		</dd>
		<dt>
			<label for="delete">Delete</label> (required
			<a
				href="https://github.com/nostr-protocol/nips/blob/master/07.md"
				target="_blank"
				rel="noopener noreferrer">NIP-07</a
			> extension)
		</dt>
		<dd>
			<button
				id="delete"
				onclick={deleteFileExec}
				disabled={fileHashToDelete.length === 0 || isInProcess}>Delete</button
			>
		</dd>
		<dt>Result</dt>
		<dd>
			<pre><code
					>{#if fileDeleteResponse !== undefined}{fileDeleteResponse}{/if}</code
				></pre>
		</dd>
	</dl>
</fieldset>
