<script lang="ts">
	import { BlossomClient, type BlobDescriptor } from 'nostr-tools/nipb7';
	import type { Signer } from 'nostr-tools/signer';
	import * as mediabunny from 'mediabunny';

	interface FileUploadResponse extends BlobDescriptor {
		nip94?: Array<[string, string]> | undefined;
	}

	let { uploaderURLs, targetUrlToUpload }: { uploaderURLs: string[]; targetUrlToUpload: string } =
		$props();
	let filesToUpload: FileList | undefined = $state();
	let isInProcess: boolean = $state(false);
	let fileUploadResponse: FileUploadResponse | undefined = $state();
	let errorMessage: string | undefined = $state();
	const getUploadUrl = (fur: FileUploadResponse | undefined): string | undefined => {
		if (fur === undefined) {
			return undefined;
		}
		if (fur.nip94 === undefined) {
			if (URL.canParse(fur.url)) {
				return fur.url;
			} else {
				return undefined;
			}
		}
		const urlRoot = fur.url;
		const urlNip94 = fur.nip94.find((tag) => tag[0] === 'url')?.at(1) ?? '';
		return URL.canParse(urlNip94) ? urlNip94 : URL.canParse(urlRoot) ? urlRoot : undefined;
	};
	let uploadUrl: string | undefined = $derived(getUploadUrl(fileUploadResponse));

	const uploadExec = async () => {
		fileUploadResponse = undefined;
		const signer: Signer | undefined = window.nostr;
		let file: File | null = getFile();
		if (signer === undefined || file === null) {
			return;
		}
		isInProcess = true;
		errorMessage = undefined;
		if (/^(video|audio)/.test(file.type)) {
			file = await compress(file);
		}
		console.info('file uploading...');
		try {
			const client = new BlossomClient(targetUrlToUpload, signer);
			fileUploadResponse = await client.uploadFile(file);
			console.info('file uploading complete');
		} catch (error) {
			console.error(error);
			errorMessage = (error as Error).message;
		}
		isInProcess = false;
	};

	const getFile = (): File | null => {
		if (filesToUpload === undefined || filesToUpload.length === 0) {
			return null;
		}
		let file: File | undefined;
		for (const f of filesToUpload) {
			file = f;
		}
		if (file === undefined) {
			return null;
		}
		return file;
	};

	// https://gihyo.jp/article/2025/10/misskey-20
	const compress = async (source: File): Promise<File> => {
		// 入力を準備
		const input = new mediabunny.Input({
			source: new mediabunny.BlobSource(source),
			formats: mediabunny.ALL_FORMATS
		});

		// 出力を準備。今回はmp4で出力
		const output = new mediabunny.Output({
			target: new mediabunny.BufferTarget(),
			format: new mediabunny.Mp4OutputFormat()
		});

		// 変換を行うインスタンス。今回はビットレートのクオリティをLOWにすることで、圧縮を行うように指定
		const conversion = await mediabunny.Conversion.init({
			input,
			output,
			video: {
				bitrate: mediabunny.QUALITY_LOW
			},
			audio: {
				bitrate: mediabunny.QUALITY_LOW
			}
		});

		// 処理の進捗が更新されたときのコールバック。進捗率は 0.0~1.0 で渡される
		conversion.onProgress = (p) => console.info(`${p * 100}%`);

		// 圧縮処理を実行 (注: 時間がかかる場合あり)
		console.info('file converting...');
		await conversion.execute();
		console.info('file converting complete');

		// 圧縮したデータを返す
		const file = new File([output.target.buffer!], source.name, { type: output.format.mimeType });

		const getSize = (file: File): number => Math.round((100 * file.size) / 1024 / 1024) / 100;
		console.info(`original file size: ${getSize(source)} MB`);
		console.info(`compressed file size: ${getSize(file)} MB`);

		return file;
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
				onclick={uploadExec}
				disabled={filesToUpload === undefined || filesToUpload.length === 0 || isInProcess}
				>Upload</button
			>
		</dd>
		<dt>
			<label for="uploaded-file-url">Uploaded file URL</label>
			<button
				class="copy"
				onclick={() => {
					navigator.clipboard.writeText(uploadUrl ?? '');
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
				{#if errorMessage === undefined}
					<pre><code>{JSON.stringify(fileUploadResponse, undefined, 2) ?? ''}</code></pre>
				{:else}
					<pre class="error">{errorMessage}</pre>
				{/if}
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
	.error {
		color: red;
	}
</style>
