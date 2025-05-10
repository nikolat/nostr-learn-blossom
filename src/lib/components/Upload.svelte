<script lang="ts">
	import type { EventTemplate } from 'nostr-tools/pure';
	import { BlossomClient } from 'blossom-client-sdk/client';
	import type { BlobDescriptor } from 'blossom-client-sdk';

	interface FileUploadResponse extends BlobDescriptor {
		nip94?: Array<[string, string]> | undefined;
	}

	let { uploaderURLs, targetUrlToUpload }: { uploaderURLs: string[]; targetUrlToUpload: string } =
		$props();
	let filesToUpload: FileList | undefined = $state();
	let isInProcess: boolean = $state(false);
	let fileUploadResponse: FileUploadResponse | undefined = $state();
	let uploadUrl: string | undefined = $derived.by(() => {
		if (fileUploadResponse === undefined) {
			return undefined;
		}
		if (fileUploadResponse.nip94 === undefined) {
			if (URL.canParse(fileUploadResponse.url)) {
				return fileUploadResponse.url;
			} else {
				return undefined;
			}
		}
		const urlRoot = fileUploadResponse.url;
		const urlNip94 = fileUploadResponse.nip94.find((tag) => tag[0] === 'url')?.at(1) ?? '';
		return URL.canParse(urlNip94) ? urlNip94 : URL.canParse(urlRoot) ? urlRoot : undefined;
	});

	const uploadFileExec = async () => {
		if (filesToUpload === undefined || filesToUpload.length === 0) {
			return;
		}
		const nostr = window.nostr;
		if (nostr === undefined) {
			return;
		}
		let file: File | undefined;
		for (const f of filesToUpload) {
			file = f;
		}
		if (file === undefined) {
			return;
		}
		const signer = async (e: EventTemplate) => {
			return await nostr.signEvent(e);
		};
		isInProcess = true;
		console.info('file uploading...');
		try {
			const auth = await BlossomClient.createUploadAuth(signer, file);
			fileUploadResponse = await BlossomClient.uploadBlob(targetUrlToUpload, file, { auth });
		} catch (error) {
			console.error(error);
			isInProcess = false;
			return;
		}
		console.info('file uploading complete');
		isInProcess = false;
	};
</script>

<fieldset class="tab-content" id="field-upload">
	<legend>Upload</legend>
	<dl>
		<dt><label for="uploader-url-to-upload">Target URL</label></dt>
		<dd>
			<select id="uploader-url-to-upload" bind:value={targetUrlToUpload}>
				{#each uploaderURLs as url (url)}
					<option value={url}>{url}</option>
				{/each}
			</select>
		</dd>
		<dt><label for="select-file">Select file to upload</label></dt>
		<dd><input id="select-file" type="file" bind:files={filesToUpload} /></dd>
		<dt>
			<label for="upload">Upload</label> (required
			<a
				href="https://github.com/nostr-protocol/nips/blob/master/07.md"
				target="_blank"
				rel="noopener noreferrer">NIP-07</a
			> extension)
		</dt>
		<dd>
			<button
				id="upload"
				onclick={uploadFileExec}
				disabled={filesToUpload === undefined || filesToUpload.length === 0 || isInProcess}
				>Upload</button
			>
		</dd>
		<dt>
			<label for="uploaded-file-url">Uploaded file URL</label>
			<button
				class="copy"
				onclick={() => {
					navigator.clipboard.writeText(fileUploadResponse?.url ?? '');
				}}
				title="Copy to clipboard"
				aria-label="Copy to clipboard"><svg><use xlink:href="./copy.svg#copy"></use></svg></button
			>
		</dt>
		<dd>
			<input id="uploaded-file-url" type="text" value={uploadUrl ?? ''} readonly />
			{#if fileUploadResponse !== undefined && uploadUrl !== undefined}
				{@const m =
					fileUploadResponse.type ??
					fileUploadResponse.nip94?.find((tag) => tag[0] === 'm')?.at(1) ??
					''}
				{#if /^image/.test(m)}
					<a href={uploadUrl} target="_blank" rel="noopener noreferrer"
						><img src={uploadUrl} alt="" /></a
					>
				{:else if /^video/.test(m)}
					<video controls preload="metadata">
						<track kind="captions" />
						<source src={uploadUrl} />
					</video>
				{:else if /^audio/.test(m)}
					<audio controls preload="metadata" src={uploadUrl}></audio>
				{:else}
					<a href={uploadUrl} target="_blank" rel="noopener noreferrer">{uploadUrl}</a>
				{/if}
			{/if}
		</dd>
		<dt>Result</dt>
		<dd>
			<details>
				<summary>Result</summary>
				<pre><code>{JSON.stringify(fileUploadResponse, undefined, 2) ?? ''}</code></pre>
			</details>
		</dd>
	</dl>
</fieldset>

<style>
	button.copy {
		padding: 0;
		width: 20px;
		height: 20px;
		fill: white;
	}
	button.copy svg {
		width: 16px;
		height: 16px;
	}
	button.copy:active > svg {
		fill: yellow;
	}
</style>
