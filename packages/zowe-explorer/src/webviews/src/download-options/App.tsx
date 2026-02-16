import { useEffect, useMemo, useState } from "preact/hooks";
import { VSCodeButton, VSCodeCheckbox, VSCodeDivider, VSCodeOption, VSCodeTextField, VSCodeDropdown } from "@vscode/webview-ui-toolkit/react";
import * as l10n from "@vscode/l10n";
import { isSecureOrigin } from "../utils";

type ViewMode = "dataset" | "uss-file" | "uss-directory";

type FilterOptions = {
  includeHidden?: boolean;
  filesys?: boolean;
  group?: number | string;
  user?: number | string;
  mtime?: number | string;
  size?: number | string;
  perm?: string;
  type?: string;
  depth?: number;
};

type ViewOptions = {
  overwrite?: boolean;
  generateDirectory?: boolean;
  uppercaseNames?: boolean;
  chooseEncoding?: boolean;
  overrideExtension?: boolean;
  fileExtension?: string;
  dirOptions?: {
    followSymlinks?: boolean;
    chooseFilterOptions?: boolean;
  };
  dirFilterOptions?: FilterOptions;
};

const vscodeApi = acquireVsCodeApi();

export function App() {
  const [mode, setMode] = useState<ViewMode>("dataset");
  const [options, setOptions] = useState<ViewOptions>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!isSecureOrigin(event.origin)) {
        return;
      }
      if (!event.data) {
        return;
      }

      if (event.data.command === "GET_LOCALIZATION") {
        const { contents } = event.data;
        l10n.config({ contents });
        return;
      }

      if (event.data.command === "initialize" && event.data.payload) {
        setMode(event.data.payload.mode as ViewMode);
        setOptions((event.data.payload.options ?? {}) as ViewOptions);
        setReady(true);
      }
    };

    window.addEventListener("message", listener);
    vscodeApi.postMessage({ command: "GET_LOCALIZATION" });
    vscodeApi.postMessage({ command: "ready" });

    return () => window.removeEventListener("message", listener);
  }, []);

  const setOption = (key: keyof ViewOptions, value: unknown) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const setDirOption = (key: "followSymlinks" | "chooseFilterOptions", value: boolean) => {
    setOptions((prev) => ({
      ...prev,
      dirOptions: {
        ...(prev.dirOptions ?? {}),
        [key]: value,
      },
    }));
  };

  const setFilterOption = (key: keyof FilterOptions, value: FilterOptions[keyof FilterOptions]) => {
    setOptions((prev) => ({
      ...prev,
      dirFilterOptions: {
        ...(prev.dirFilterOptions ?? {}),
        [key]: value,
      },
    }));
  };

  const extensionError = useMemo(() => {
    if (!options.overrideExtension) {
      return "";
    }
    const value = (options.fileExtension ?? "").trim();
    if (!value) {
      return l10n.t("File extension cannot be empty when override is enabled");
    }
    const normalizedValue = value.startsWith(".") ? value.slice(1) : value;
    if (!/^[a-zA-Z0-9_-]+$/.test(normalizedValue)) {
      return l10n.t("File extension can only contain letters, numbers, hyphens, and underscores");
    }
    return "";
  }, [options.overrideExtension, options.fileExtension]);

  const save = () => {
    if (mode === "dataset" && extensionError) {
      return;
    }

    vscodeApi.postMessage({ command: "submit", options });
  };

  const filterTypeValue = (options.dirFilterOptions?.type ?? "") as string;

  return ready ? (
    <div style={{ padding: "0.5rem 1rem" }}>
      <h1>{l10n.t("Download Options")}</h1>
      <p style={{ opacity: 0.85 }}>
        {mode === "dataset"
          ? l10n.t("Configure saved options for Data Set downloads.")
          : mode === "uss-directory"
          ? l10n.t("Configure saved options for USS directory downloads.")
          : l10n.t("Configure saved options for USS file downloads.")}
      </p>

      <VSCodeDivider />

      <h3>{l10n.t("Common")}</h3>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <VSCodeCheckbox checked={!!options.overwrite} onChange={(e: any) => setOption("overwrite", e.target.checked)}>
          {l10n.t("Overwrite")}
        </VSCodeCheckbox>
        <VSCodeCheckbox checked={!!options.generateDirectory} onChange={(e: any) => setOption("generateDirectory", e.target.checked)}>
          {l10n.t("Generate Directory Structure")}
        </VSCodeCheckbox>
        <VSCodeCheckbox checked={!!options.chooseEncoding} onChange={(e: any) => setOption("chooseEncoding", e.target.checked)}>
          {l10n.t("Choose Encoding")}
        </VSCodeCheckbox>
      </div>

      {mode === "dataset" && (
        <>
          <h3>{l10n.t("Data Set")}</h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <VSCodeCheckbox checked={!!options.uppercaseNames} onChange={(e: any) => setOption("uppercaseNames", e.target.checked)}>
              {l10n.t("Use Uppercase Names")}
            </VSCodeCheckbox>
            <VSCodeCheckbox checked={!!options.overrideExtension} onChange={(e: any) => setOption("overrideExtension", e.target.checked)}>
              {l10n.t("Override File Extension")}
            </VSCodeCheckbox>
            <VSCodeTextField
              disabled={!options.overrideExtension}
              value={options.fileExtension ?? ""}
              onInput={(e: any) => setOption("fileExtension", e.target.value)}
            >
              {l10n.t("File Extension")}
            </VSCodeTextField>
            {extensionError && <span style={{ color: "var(--vscode-errorForeground)" }}>{extensionError}</span>}
          </div>
        </>
      )}

      {mode === "uss-directory" && (
        <>
          <h3>{l10n.t("USS Directory")}</h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <VSCodeCheckbox checked={!!options.dirOptions?.followSymlinks} onChange={(e: any) => setDirOption("followSymlinks", e.target.checked)}>
              {l10n.t("Follow Symlinks")}
            </VSCodeCheckbox>
            <VSCodeCheckbox
              checked={!!options.dirOptions?.chooseFilterOptions}
              onChange={(e: any) => setDirOption("chooseFilterOptions", e.target.checked)}
            >
              {l10n.t("Apply Filter Options")}
            </VSCodeCheckbox>
          </div>

          <h3>{l10n.t("Filter Options")}</h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <VSCodeCheckbox
              checked={!!options.dirFilterOptions?.includeHidden}
              onChange={(e: any) => setFilterOption("includeHidden", e.target.checked)}
            >
              {l10n.t("Include Hidden Files")}
            </VSCodeCheckbox>
            <VSCodeCheckbox checked={!!options.dirFilterOptions?.filesys} onChange={(e: any) => setFilterOption("filesys", e.target.checked)}>
              {l10n.t("Search All Filesystems")}
            </VSCodeCheckbox>
            <VSCodeTextField value={(options.dirFilterOptions?.group ?? "") as string} onInput={(e: any) => setFilterOption("group", e.target.value)}>
              {l10n.t("Group")}
            </VSCodeTextField>
            <VSCodeTextField value={(options.dirFilterOptions?.user ?? "") as string} onInput={(e: any) => setFilterOption("user", e.target.value)}>
              {l10n.t("User")}
            </VSCodeTextField>
            <VSCodeTextField value={(options.dirFilterOptions?.mtime ?? "") as string} onInput={(e: any) => setFilterOption("mtime", e.target.value)}>
              {l10n.t("Modification Time")}
            </VSCodeTextField>
            <VSCodeTextField value={(options.dirFilterOptions?.size ?? "") as string} onInput={(e: any) => setFilterOption("size", e.target.value)}>
              {l10n.t("Size")}
            </VSCodeTextField>
            <VSCodeTextField value={(options.dirFilterOptions?.perm ?? "") as string} onInput={(e: any) => setFilterOption("perm", e.target.value)}>
              {l10n.t("Permissions")}
            </VSCodeTextField>
            <VSCodeDropdown value={filterTypeValue} onChange={(e: any) => setFilterOption("type", e.target.value)}>
              <span>{l10n.t("File Type")}</span>
              <VSCodeOption value="">{l10n.t("(Any)")}</VSCodeOption>
              <VSCodeOption value="c">c</VSCodeOption>
              <VSCodeOption value="d">d</VSCodeOption>
              <VSCodeOption value="f">f</VSCodeOption>
              <VSCodeOption value="l">l</VSCodeOption>
              <VSCodeOption value="p">p</VSCodeOption>
              <VSCodeOption value="s">s</VSCodeOption>
            </VSCodeDropdown>
            <VSCodeTextField
              value={options.dirFilterOptions?.depth?.toString() ?? ""}
              onInput={(e: any) => {
                const value = e.target.value?.trim();
                setFilterOption("depth", value === "" || Number.isNaN(Number(value)) ? undefined : Number(value));
              }}
            >
              {l10n.t("Depth")}
            </VSCodeTextField>
          </div>
        </>
      )}

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
        <VSCodeButton onClick={save}>{l10n.t("Save and Continue")}</VSCodeButton>
        <VSCodeButton appearance="secondary" onClick={() => vscodeApi.postMessage({ command: "cancel" })}>
          {l10n.t("Cancel")}
        </VSCodeButton>
      </div>
    </div>
  ) : null;
}
