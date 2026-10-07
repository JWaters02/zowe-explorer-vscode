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

import * as vscode from "vscode";
import * as path from "path";
import { IZoweTreeNode, PersistenceSchemaEnum, ZoweScheme } from "@zowe/zowe-explorer-api";
import { Constants } from "../../configuration/Constants";
import { Definitions } from "../../configuration/Definitions";
import { IconGenerator } from "../../icons/IconGenerator";
import { IconUtils } from "../../icons/IconUtils";
import { ZoweLocalStorage } from "../../tools/ZoweLocalStorage";
import { ZoweLogger } from "../../tools/ZoweLogger";
import { SharedContext } from "./SharedContext";
import { SharedUtils } from "./SharedUtils";

export class NodeColors {
    public static readonly COLOR_KEYS: string[] = ["red", "orange", "yellow", "green", "blue", "purple", "magenta", "gray"];

    public static readonly SHAPE_BY_ICON_ID: Partial<Record<IconUtils.IconId, string>> = {
        [IconUtils.IconId.document]: "document",
        [IconUtils.IconId.downloadedDocument]: "document",
        [IconUtils.IconId.documentBinary]: "document",
        [IconUtils.IconId.documentBinaryDownloaded]: "document",
        [IconUtils.IconId.folder]: "folder-closed",
        [IconUtils.IconId.filterFolder]: "folder-closed",
        [IconUtils.IconId.folderOpen]: "folder-open",
        [IconUtils.IconId.filterFolderOpen]: "folder-open",
        [IconUtils.IconId.pattern]: "pattern",
    };

    private static readonly TREE_KEY_DS = "ds";
    private static readonly TREE_KEY_USS = "uss";
    private static readonly TREE_KEY_JOBS = "jobs";

    private static assignments: Map<string, string> = new Map();

    private static baseTooltips: WeakMap<IZoweTreeNode, IZoweTreeNode["tooltip"]> = new WeakMap();

    public static getPalette(): { key: string; displayName: string }[] {
        const displayNames: Record<string, string> = {
            red: vscode.l10n.t("Red"),
            orange: vscode.l10n.t("Orange"),
            yellow: vscode.l10n.t("Yellow"),
            green: vscode.l10n.t("Green"),
            blue: vscode.l10n.t("Blue"),
            purple: vscode.l10n.t("Purple"),
            magenta: vscode.l10n.t("Magenta"),
            gray: vscode.l10n.t("Gray"),
        };
        return NodeColors.COLOR_KEYS.map((key) => ({ key, displayName: displayNames[key] }));
    }

    public static initialize(): void {
        ZoweLogger.trace("NodeColors.initialize called.");
        const stored = ZoweLocalStorage.getValue<Definitions.NodeColorAssignments>(Definitions.LocalStorageKey.NODE_COLORS) ?? {};
        NodeColors.assignments = new Map(Object.entries(stored));
    }

    public static async flush(): Promise<void> {
        ZoweLogger.trace("NodeColors.flush called.");
        await ZoweLocalStorage.setValue<Definitions.NodeColorAssignments>(
            Definitions.LocalStorageKey.NODE_COLORS,
            Object.fromEntries(NodeColors.assignments)
        );
    }

    public static keyFor(node: IZoweTreeNode): string | undefined {
        const profileName = node?.getProfileName();
        if (profileName == null || node.contextValue == null) {
            return undefined;
        }

        const baseContext = SharedContext.getBaseContext(node);
        let label: string;
        let memberName: string;

        if (node.resourceUri?.scheme === ZoweScheme.USS) {
            label = node.fullPath || node.label?.toString();
        } else if (baseContext === Constants.DS_MEMBER_CONTEXT) {
            label = node.getParent()?.label?.toString();
            memberName = node.label?.toString();
        } else {
            label = node.label?.toString();
        }

        if (label == null) {
            return undefined;
        }

        return `${NodeColors.treeKeyFor(node)}|${SharedUtils.favoriteEntry(profileName, label, baseContext, memberName)}`;
    }

    public static get(node: IZoweTreeNode): string | undefined {
        const key = NodeColors.keyFor(node);
        return key != null ? NodeColors.assignments.get(key) : undefined;
    }

    public static set(node: IZoweTreeNode, colorKey: string): void {
        const key = NodeColors.keyFor(node);
        if (key == null) {
            ZoweLogger.warn(`NodeColors.set: could not derive a key for node ${node?.label?.toString()}`);
            return;
        }
        NodeColors.assignments.set(key, colorKey);
    }

    public static clear(node: IZoweTreeNode): void {
        const key = NodeColors.keyFor(node);
        if (key != null) {
            NodeColors.assignments.delete(key);
        }
    }

    public static clearEntry(treeKey: string, profileName: string, label: string, baseContext: string, memberName?: string): void {
        NodeColors.assignments.delete(`${treeKey}|${SharedUtils.favoriteEntry(profileName, label, baseContext, memberName)}`);
    }

    public static pruneProfile(treeKey: string, profileName: string): void {
        const prefix = `${treeKey}|[${profileName}]: `;
        for (const key of NodeColors.assignments.keys()) {
            if (key.startsWith(prefix)) {
                NodeColors.assignments.delete(key);
            }
        }
    }

    public static applyTo(node: IZoweTreeNode): void {
        if (NodeColors.assignments.size === 0) {
            return;
        }

        const colorKey = NodeColors.get(node);
        if (colorKey == null || !NodeColors.COLOR_KEYS.includes(colorKey)) {
            return;
        }

        const iconId = IconGenerator.getIconByNode(node)?.id;
        const shape = NodeColors.SHAPE_BY_ICON_ID[iconId];
        if (shape == null) {
            return;
        }
        node.iconPath = NodeColors.coloredIconPath(shape, colorKey);

        if (!NodeColors.baseTooltips.has(node)) {
            NodeColors.baseTooltips.set(node, node.tooltip);
        }
        node.tooltip = NodeColors.withColorTooltip(NodeColors.baseTooltips.get(node), colorKey);
    }

    public static coloredIconPath(shape: string, colorKey: string): vscode.Uri {
        return vscode.Uri.file(path.join(Constants.ROOTPATH, "resources", "colored", `${shape}-${colorKey}.svg`));
    }

    public static restoreTooltip(node: IZoweTreeNode): void {
        if (NodeColors.baseTooltips.has(node)) {
            node.tooltip = NodeColors.baseTooltips.get(node);
            NodeColors.baseTooltips.delete(node);
        }
    }

    public static withColorTooltip(tooltip: IZoweTreeNode["tooltip"], colorKey: string): IZoweTreeNode["tooltip"] {
        const displayName = NodeColors.getPalette().find((color) => color.key === colorKey)?.displayName;
        if (displayName == null) {
            return tooltip;
        }

        const colorLine = vscode.l10n.t({
            message: "Color: {0}",
            args: [displayName],
            comment: ["Color name"],
        });

        if (tooltip instanceof vscode.MarkdownString) {
            const updated = new vscode.MarkdownString(tooltip.value);
            updated.appendMarkdown(`\n\n${colorLine}`);
            return updated;
        }

        return tooltip ? `${tooltip.toString()}\n${colorLine}` : colorLine;
    }

    public static treeKeyFor(node: IZoweTreeNode): string {
        switch (node?.resourceUri?.scheme) {
            case ZoweScheme.USS:
                return NodeColors.TREE_KEY_USS;
            case ZoweScheme.Jobs:
                return NodeColors.TREE_KEY_JOBS;
            default:
                return NodeColors.TREE_KEY_DS;
        }
    }

    public static treeKeyForSchema(schema: PersistenceSchemaEnum): string {
        switch (schema) {
            case PersistenceSchemaEnum.USS:
                return NodeColors.TREE_KEY_USS;
            case PersistenceSchemaEnum.Job:
                return NodeColors.TREE_KEY_JOBS;
            default:
                return NodeColors.TREE_KEY_DS;
        }
    }
}
