/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 *
 */

import { DeferredPromise, WebView } from "@zowe/zowe-explorer-api";
import * as vscode from "vscode";
import * as fs from "fs";

export type DownloadOptionsViewMode = "dataset" | "uss-file" | "uss-directory";

export type DownloadOptionsViewPayload = {
    mode: DownloadOptionsViewMode;
    options: Record<string, unknown>;
};

export class DownloadOptionsView extends WebView {
    private readonly payload: DownloadOptionsViewPayload;
    private readonly userSubmission = new DeferredPromise<Record<string, unknown> | undefined>();
    private isSubmissionComplete = false;

    public constructor(context: vscode.ExtensionContext, payload: DownloadOptionsViewPayload) {
        super(vscode.l10n.t("Download Options"), "download-options", context, {
            onDidReceiveMessage: (message: object) => this.onDidReceiveMessage(message),
            retainContext: true,
        });
        this.payload = payload;
        this.panel.onDidDispose(() => {
            if (!this.isSubmissionComplete) {
                this.isSubmissionComplete = true;
                this.userSubmission.resolve(undefined);
            }
        });
    }

    public async waitForSubmission(): Promise<Record<string, unknown> | undefined> {
        return this.userSubmission.promise;
    }

    protected async onDidReceiveMessage(message: any): Promise<void> {
        switch (message.command) {
            case "ready":
                await this.panel.webview.postMessage({
                    command: "initialize",
                    payload: this.payload,
                });
                break;
            case "submit":
                this.isSubmissionComplete = true;
                this.userSubmission.resolve(message.options ?? this.payload.options);
                this.panel.dispose();
                break;
            case "cancel":
                this.isSubmissionComplete = true;
                this.userSubmission.resolve(undefined);
                this.panel.dispose();
                break;
            case "GET_LOCALIZATION": {
                const filePath = vscode.l10n.uri?.fsPath + "";
                fs.readFile(filePath, "utf8", (err, data) => {
                    if (err) {
                        return;
                    }
                    if (!this.panel) {
                        return;
                    }
                    this.panel.webview.postMessage({
                        command: "GET_LOCALIZATION",
                        contents: data,
                    });
                });
                break;
            }
            default:
                break;
        }
    }

    public static async show(context: vscode.ExtensionContext, payload: DownloadOptionsViewPayload): Promise<Record<string, unknown> | undefined> {
        const view = new DownloadOptionsView(context, payload);
        return view.waitForSubmission();
    }
}
