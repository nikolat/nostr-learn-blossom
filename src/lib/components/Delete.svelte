<script lang="ts">
	import { BlossomClient } from 'nostr-tools/nipb7';
	import type { Signer } from 'nostr-tools/signer';

	let {
		uploaderURLs,
		targetUrlToDelete,
		fileHashToDelete
	}: { uploaderURLs: string[]; targetUrlToDelete: string; fileHashToDelete: string } = $props();
	let isInProcess: boolean = $state(false);

	const deleteFileExec = async () => {
		const signer: Signer | undefined = window.nostr;
		if (signer === undefined) {
			return;
		}
		isInProcess = true;
		console.info('file deleting...');
		try {
			const client = new BlossomClient(targetUrlToDelete, signer);
			await client.delete(fileHashToDelete);
			console.info('file deleting complete');
		} catch (error) {
			console.error(error);
		}
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
	</dl>
</fieldset>
