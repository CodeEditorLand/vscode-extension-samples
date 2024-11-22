import { basename } from "path";
import {
	CancellationToken,
	Disposable,
	Event,
	EventEmitter,
	ProviderResult,
	TextDocumentContentProvider,
	Uri,
} from "vscode";

import { Fiddle, JSFIDDLE_SCHEME, toExtension } from "./fiddleRepository";

/**
 * Provides the content of the JS Fiddle documents as fetched from the server i.e.  without the local edits.
 * This is used for the source control diff.
 */
export class JSFiddleDocumentContentProvider
	implements TextDocumentContentProvider, Disposable
{
	private _onDidChange = new EventEmitter<Uri>();
	private fiddles = new Map<string, Fiddle>(); // this assumes each fiddle is only open once per workspace

	get onDidChange(): Event<Uri> {
		return this._onDidChange.event;
	}

	dispose(): void {
		this._onDidChange.dispose();
	}

	updated(newFiddle: Fiddle): void {
		this.fiddles.set(newFiddle.slug, newFiddle);

		// let's assume all 3 documents actually changed and notify the quick-diff
		this._onDidChange.fire(
			Uri.parse(`${JSFIDDLE_SCHEME}:${newFiddle.slug}.html`),
		);
		this._onDidChange.fire(
			Uri.parse(`${JSFIDDLE_SCHEME}:${newFiddle.slug}.css`),
		);
		this._onDidChange.fire(
			Uri.parse(`${JSFIDDLE_SCHEME}:${newFiddle.slug}.js`),
		);
	}

	provideTextDocumentContent(
		uri: Uri,
		token: CancellationToken,
	): ProviderResult<string> {
		if (token.isCancellationRequested) {
			return "Canceled";
		}

		let fiddleSlug = basename(uri.fsPath);
		// strip off the file extension
		fiddleSlug = fiddleSlug.split(".").slice(0, -1).join(".");

		const fiddlePart = toExtension(uri);

		const fiddle = this.fiddles.get(fiddleSlug);

		if (!fiddle) {
			return "Resource not found: " + uri.toString();
		}

		return fiddle.data[fiddlePart];
	}
}
