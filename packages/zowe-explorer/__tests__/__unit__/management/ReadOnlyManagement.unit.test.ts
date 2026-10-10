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
import { ZoweScheme } from "@zowe/zowe-explorer-api";
import { ReadOnlyManagement } from "../../../src/management/ReadOnlyManagement";
import { SettingsConfig } from "../../../src/configuration/SettingsConfig";
import { Constants } from "../../../src/configuration/Constants";
import { MockedProperty } from "../../__mocks__/mockUtils";

describe("ReadOnlyManagement - dsMaskToRegex", () => {
    const matches = (mask: string, dsName: string, includeLowerLevels?: boolean): boolean =>
        ReadOnlyManagement.dsMaskToRegex(mask, includeLowerLevels).test(dsName);

    describe("mask without wildcards", () => {
        it.each([
            ["Z02589.LOADLIB", "Z02589.LOADLIB", true],
            ["Z02589.LOADLIB", "Z02589.LOADLIB.BACKUP", true],
            ["Z02589.LOADLIB", "Z02589.LOAD", false],
            ["Z02589.LOADLIB", "Z02589", false],
            ["Z02589.LOADLIB", "Z02589.JCL", false],
            ["Z02589.LOADLIB", "XZ02589.LOADLIB", false],
            ["Z02589.LOADLIB", "ZXP.Z02589.LOADLIB", false],
            ["ZXP", "ZXP", true],
            ["ZXP", "ZXP.PUBLIC.JCL", true],
            ["ZXP", "ZXPUBLIC.JCL", false],
            ["ZXP.PUBLIC", "ZXP.PUBLIC.JCL", true],
            ["ZXP.PUBLIC", "ZXP.PUBLICX.JCL", false],
            ["SYS1.PROCLIB", "SYS1.PROCLIB", true],
            ["SYS1.PROCLIB", "SYS1.PARMLIB", false],
        ])("%s matches %s: %s", (mask, dsName, expected) => {
            expect(matches(mask, dsName)).toBe(expected);
        });

        it("treats the qualifier separator as a literal dot", () => {
            expect(matches("Z02589.JCL", "Z02589XJCL")).toBe(false);
            expect(matches("SYS1.PROCLIB", "SYS1XPROCLIB")).toBe(false);
        });
    });

    describe("* wildcard (zero or more characters within one qualifier)", () => {
        it.each([
            ["Z02589.*", "Z02589.JCL", true],
            ["Z02589.*", "Z02589.SOURCE", true],
            ["Z02589.*", "Z02589.LOADLIB", true],
            ["Z02589.*", "Z02589.SOURCE.COBOL", true],
            ["Z02589.*", "Z025890.JCL", false],
            ["Z02589.*", "Z0258.JCL", false],
            ["Z02589.*", "ZXP.PUBLIC.JCL", false],
            ["Z02589.LOAD*", "Z02589.LOAD", true],
            ["Z02589.LOAD*", "Z02589.LOADLIB", true],
            ["Z02589.LOAD*", "Z02589.LOADLIB.BACKUP", true],
            ["Z02589.LOAD*", "Z02589.JCL", false],
            ["Z02589.*LIB", "Z02589.LOADLIB", true],
            ["Z02589.*LIB", "Z02589.LIB", true],
            ["Z02589.*LIB", "Z02589.LIBRARY", false],
            ["Z0*.JCL", "Z02589.JCL", true],
            ["Z0*.JCL", "Z00001.JCL", true],
            ["Z0*.JCL", "ZXP.JCL", false],
            ["*.JCL", "Z02589.JCL", true],
            ["*.JCL", "ZXP.JCL", true],
            ["*.JCL", "Z02589.JCL.BACKUP", true],
            ["*.JCL", "ZXP.PUBLIC.JCL", false],
            ["ZXP.*.JCL", "ZXP.PUBLIC.JCL", true],
            ["ZXP.*.JCL", "ZXP.JCL", false],
            ["ZXP.*.JCL", "ZXP.PUBLIC.SOURCE", false],
            ["Z02589.*.*", "Z02589.SOURCE.COBOL", true],
            ["Z02589.*.*", "Z02589.JCL", false],
            ["*PR*", "NDRPR", true],
            ["*PR*", "PROD.APP", true],
            ["*PR*", "ZXP.PUBLIC", false],
        ])("%s matches %s: %s", (mask, dsName, expected) => {
            expect(matches(mask, dsName)).toBe(expected);
        });
    });

    describe("% wildcard (exactly one character within a qualifier)", () => {
        it.each([
            ["Z0258%.JCL", "Z02589.JCL", true],
            ["Z0258%.JCL", "Z02580.JCL", true],
            ["Z0258%.JCL", "Z025899.JCL", false],
            ["Z0258%.JCL", "Z0258.JCL", false],
            ["Z02589.%%%", "Z02589.JCL", true],
            ["Z02589.%%%", "Z02589.CBL", true],
            ["Z02589.%%%", "Z02589.LOADLIB", false],
            ["Z02589.%%%", "Z02589.JC", false],
            ["Z02589.%%%", "Z02589.JCL.BACKUP", true],
            ["SYS%.**", "SYS1.PROCLIB", true],
            ["SYS%.**", "SYS2.PARMLIB", true],
            ["SYS%.**", "SYS10.PROCLIB", false],
            ["SYS%.**", "SYS.PROCLIB", false],
            ["%%%PR*", "NDRPR", true],
            ["%%%PR*", "NXTPR", true],
            ["%%%PR*", "NDRPR.SRC.COBOL", true],
            ["%%%PR*", "NXTPROD.LOADLIB", true],
            ["%%%PR*", "NDRD0.SRC.COBOL", false],
            ["%%%PR*", "NXTQA.SRC.COBOL", false],
            ["%%%PR*", "NDPR.SRC", false],
            ["%%%PR*", "NDRXPR.SRC", false],
            ["Z02589.%*", "Z02589.JCL", true],
        ])("%s matches %s: %s", (mask, dsName, expected) => {
            expect(matches(mask, dsName)).toBe(expected);
        });

        it("does not let % match the qualifier separator", () => {
            expect(matches("ZXP%PUBLIC", "ZXP.PUBLIC")).toBe(false);
            expect(matches("Z02589%JCL", "Z02589.JCL")).toBe(false);
        });
    });

    describe("** wildcard (zero or more qualifiers)", () => {
        it.each([
            ["**", "Z02589.JCL", true],
            ["**", "SYS1.PROCLIB", true],
            ["**", "ZXP", true],
            ["ZXP.**", "ZXP", true],
            ["ZXP.**", "ZXP.PUBLIC", true],
            ["ZXP.**", "ZXP.PUBLIC.JCL", true],
            ["ZXP.**", "ZXP.PUBLIC.SOURCE.COBOL", true],
            ["ZXP.**", "ZXPUBLIC.JCL", false],
            ["ZXP.**", "Z02589.ZXP", false],
            ["**.JCL", "Z02589.JCL", true],
            ["**.JCL", "ZXP.PUBLIC.JCL", true],
            ["**.JCL", "JCL", true],
            ["**.JCL", "Z02589.JCL.BACKUP", true],
            ["**.JCL", "Z02589.MYJCL", false],
            ["**.JCL", "Z02589.JCLLIB", false],
            ["ZXP.**.JCL", "ZXP.JCL", true],
            ["ZXP.**.JCL", "ZXP.PUBLIC.JCL", true],
            ["ZXP.**.JCL", "ZXP.PUBLIC.ARCHIVE.JCL", true],
            ["ZXP.**.JCL", "ZXP.PUBLIC.SOURCE", false],
            ["ZXP.**.JCL", "ZXPX.JCL", false],
            ["ZXP.**.JCL", "Z02589.JCL", false],
            ["ZXP.**.JCL", "ZXP.PUBLIC.XJCL", false],
            ["ZXP.**.JCL", "ZXP.PUBLIC.JCLX.SOURCE", false],
            ["**.LOADLIB.**", "Z02589.LOADLIB", true],
            ["**.LOADLIB.**", "Z02589.LOADLIB.BACKUP", true],
            ["**.LOADLIB.**", "LOADLIB", true],
            ["**.LOADLIB.**", "Z02589.LOAD", false],
            ["SYS1.**.LINKLIB", "SYS1.LINKLIB", true],
            ["SYS1.**.LINKLIB", "SYS1.CSSLIB", false],
        ])("%s matches %s: %s", (mask, dsName, expected) => {
            expect(matches(mask, dsName)).toBe(expected);
        });
    });

    describe("combined wildcards", () => {
        it.each([
            ["Z0258%.LOAD*.**", "Z02589.LOADLIB.BACKUP", true],
            ["Z0258%.LOAD*.**", "Z02589.LOAD", true],
            ["Z0258%.LOAD*.**", "Z02589.JCL", false],
            ["%%%PR*.**", "NDRPR", true],
            ["%%%PR*.**", "NDRPR.SRC.COBOL", true],
            ["%%%PR*.**", "NDRD0.SRC.COBOL", false],
            ["**.%%%", "Z02589.JCL", true],
            ["**.%%%", "ZXP.PUBLIC.CBL", true],
            ["*.**.LOAD*", "Z02589.LOADLIB", true],
            ["*.**.LOAD*", "Z02589.TEST.LOADLIB", true],
            ["*.**.LOAD*", "LOADLIB", false],
        ])("%s matches %s: %s", (mask, dsName, expected) => {
            expect(matches(mask, dsName)).toBe(expected);
        });
    });

    describe("case and whitespace", () => {
        it("ignores case in the mask and the data set name", () => {
            expect(matches("z02589.loadlib", "Z02589.LOADLIB")).toBe(true);
            expect(matches("zxp.**", "ZXP.PUBLIC.JCL")).toBe(true);
            expect(matches("Z02589.LOADLIB", "z02589.loadlib")).toBe(true);
        });

        it("ignores leading and trailing whitespace in the mask", () => {
            expect(matches("  ZXP.**  ", "ZXP.PUBLIC.JCL")).toBe(true);
            expect(matches("\tZ02589.LOADLIB ", "Z02589.LOADLIB")).toBe(true);
        });
    });

    describe("national characters and regex special characters", () => {
        it.each([
            ["Z02589.$TEMP", "Z02589.$TEMP", true],
            ["Z02589.$TEMP", "Z02589.TEMP", false],
            ["Z02589.#BACKUP.*", "Z02589.#BACKUP.JCL", true],
            ["Z02589.#BACKUP.*", "Z02589.BACKUP.JCL", false],
            ["Z02589.@PARMS", "Z02589.@PARMS", true],
            ["$*.**", "$SYSTEM.DATA", true],
            ["$*.**", "SYSTEM.DATA", false],
        ])("%s matches %s: %s", (mask, dsName, expected) => {
            expect(matches(mask, dsName)).toBe(expected);
        });

        it("does not treat ? as a wildcard since it is not a data set mask character", () => {
            expect(matches("Z0258?.JCL", "Z02589.JCL")).toBe(false);
            expect(matches("Z02589.JC?", "Z02589.JCL")).toBe(false);
        });
    });

    describe("without lower levels", () => {
        it.each([
            ["Z02589.JCL", "Z02589.JCL", true],
            ["Z02589.JCL", "Z02589.JCL.BACKUP", false],
            ["ZXP.PUBLIC.*", "ZXP.PUBLIC.JCL", true],
            ["ZXP.PUBLIC.*", "ZXP.PUBLIC.JCL.ARCHIVE", false],
            ["ZXP.PUBLIC", "ZXP.PUBLIC.JCL", false],
            ["ZXP.**", "ZXP.PUBLIC.JCL", true],
            ["ZXP.**", "ZXP", true],
            ["**.JCL", "ZXP.PUBLIC.JCL", true],
            ["**.JCL", "ZXP.PUBLIC.JCL.ARCHIVE", false],
        ])("%s matches %s: %s", (mask, dsName, expected) => {
            expect(matches(mask, dsName, false)).toBe(expected);
        });
    });
});

describe("ReadOnlyManagement - compileDsPattern", () => {
    describe("pattern without a member mask", () => {
        it.each([
            ["Z02589.LOADLIB", "Z02589.LOADLIB", undefined, true],
            ["Z02589.LOADLIB", "Z02589.LOADLIB", "HELLO", true],
            ["Z02589.LOADLIB", "Z02589.LOADLIB.BACKUP", "HELLO", true],
            ["Z02589.LOADLIB", "Z02589.JCL", "HELLO", false],
            ["ZXP.**", "ZXP.PUBLIC.JCL", "README", true],
            ["ZXP.**", "Z02589.JCL", "README", false],
            ["Z02589.*", "Z02589.JCL", "HELLO", true],
            ["Z02589.*", "Z02589.JCL", undefined, true],
        ])("%s matches %s(%s): %s", (pattern, dsName, member, expected) => {
            expect(ReadOnlyManagement.compileDsPattern(pattern)(dsName, member)).toBe(expected);
        });
    });

    describe("pattern with a member mask", () => {
        it.each([
            ["Z02589.JCL(HELLO)", "Z02589.JCL", "HELLO", true],
            ["Z02589.JCL(HELLO)", "Z02589.JCL", undefined, false],
            ["Z02589.JCL(HELLO)", "Z02589.JCL", "HELLO2", false],
            ["Z02589.JCL(HELLO)", "Z02589.JCL", "HELL", false],
            ["Z02589.JCL(HELLO)", "Z02589.JCL.BACKUP", "HELLO", false],
            ["Z02589.JCL(HELLO)", "Z02589.SOURCE", "HELLO", false],
            ["Z02589.JCL(HELLO*)", "Z02589.JCL", "HELLO", true],
            ["Z02589.JCL(HELLO*)", "Z02589.JCL", "HELLOJOB", true],
            ["Z02589.JCL(HELLO*)", "Z02589.JCL", "XHELLO", false],
            ["Z02589.JCL(*JOB)", "Z02589.JCL", "RUNJOB", true],
            ["Z02589.JCL(*JOB)", "Z02589.JCL", "JOB", true],
            ["Z02589.JCL(*JOB)", "Z02589.JCL", "JOBLIB", false],
            ["Z02589.JCL(PROD*)", "Z02589.JCL", "PRODJOB", true],
            ["Z02589.JCL(PROD*)", "Z02589.JCL", "HELLO", false],
            ["Z02589.JCL(%%%%%)", "Z02589.JCL", "HELLO", true],
            ["Z02589.JCL(%%%%%)", "Z02589.JCL", "HELL", false],
            ["Z02589.JCL(%%%%%)", "Z02589.JCL", "HELLO1", false],
            ["Z02589.JCL(HEL%O)", "Z02589.JCL", "HELLO", true],
            ["Z02589.JCL(HEL%O)", "Z02589.JCL", "HELO", false],
            ["Z02589.JCL(*)", "Z02589.JCL", "HELLO", true],
            ["Z02589.JCL(*)", "Z02589.JCL", undefined, false],
            ["Z0258%.JCL(PROD*)", "Z02589.JCL", "PRODJOB", true],
            ["Z0258%.JCL(PROD*)", "Z025899.JCL", "PRODJOB", false],
            ["ZXP.PUBLIC.*(*)", "ZXP.PUBLIC.JCL", "README", true],
            ["ZXP.PUBLIC.*(*)", "ZXP.PUBLIC.SOURCE", "HELLO", true],
            ["ZXP.PUBLIC.*(*)", "ZXP.PUBLIC.SOURCE.ARCHIVE", "HELLO", false],
            ["ZXP.PUBLIC(*)", "ZXP.PUBLIC.JCL", "README", false],
            ["ZXP.PUBLIC.**(README)", "ZXP.PUBLIC.JCL", "README", true],
            ["ZXP.PUBLIC.**(README)", "ZXP.PUBLIC.SOURCE.ARCHIVE", "README", true],
            ["ZXP.PUBLIC.**(README)", "ZXP.PUBLIC.JCL", "HELLO", false],
            ["**(PROD*)", "Z02589.JCL", "PRODJOB", true],
            ["**(PROD*)", "ZXP.PUBLIC.JCL", "PRODRUN", true],
            ["**(PROD*)", "Z02589.JCL", undefined, false],
        ])("%s matches %s(%s): %s", (pattern, dsName, member, expected) => {
            expect(ReadOnlyManagement.compileDsPattern(pattern)(dsName, member)).toBe(expected);
        });

        it("ignores case in the member mask and the member name", () => {
            expect(ReadOnlyManagement.compileDsPattern("Z02589.JCL(hello)")("Z02589.JCL", "HELLO")).toBe(true);
            expect(ReadOnlyManagement.compileDsPattern("z02589.jcl(HELLO)")("Z02589.JCL", "hello")).toBe(true);
        });

        it("ignores whitespace around the pattern and inside the brackets", () => {
            expect(ReadOnlyManagement.compileDsPattern(" Z02589.JCL(HELLO) ")("Z02589.JCL", "HELLO")).toBe(true);
            expect(ReadOnlyManagement.compileDsPattern("Z02589.JCL( HELLO )")("Z02589.JCL", "HELLO")).toBe(true);
        });

        it("treats national characters in member names literally", () => {
            expect(ReadOnlyManagement.compileDsPattern("Z02589.JCL($TEMP)")("Z02589.JCL", "$TEMP")).toBe(true);
            expect(ReadOnlyManagement.compileDsPattern("Z02589.JCL($TEMP)")("Z02589.JCL", "TEMP")).toBe(false);
            expect(ReadOnlyManagement.compileDsPattern("Z02589.JCL(#*)")("Z02589.JCL", "#BACKUP")).toBe(true);
            expect(ReadOnlyManagement.compileDsPattern("Z02589.JCL(@%%)")("Z02589.JCL", "@01")).toBe(true);
        });

        it("matches no member for an empty member mask", () => {
            const matcher = ReadOnlyManagement.compileDsPattern("Z02589.JCL()");
            expect(matcher("Z02589.JCL", "HELLO")).toBe(false);
            expect(matcher("Z02589.JCL", undefined)).toBe(false);
        });

        it("matches nothing for a pattern with unbalanced brackets", () => {
            const matcher = ReadOnlyManagement.compileDsPattern("Z02589.JCL(HELLO");
            expect(matcher("Z02589.JCL", "HELLO")).toBe(false);
            expect(matcher("Z02589.JCL", undefined)).toBe(false);
        });
    });
});

describe("ReadOnlyManagement - ussGlobToRegex", () => {
    const matches = (glob: string, path: string): boolean => ReadOnlyManagement.ussGlobToRegex(glob).test(path);

    describe("trailing /** (a directory and everything in it)", () => {
        it.each([
            ["/z/public/**", "/z/public", true],
            ["/z/public/**", "/z/public/hello.txt", true],
            ["/z/public/**", "/z/public/cobol/hello.cbl", true],
            ["/z/public/**", "/z/publicity", false],
            ["/z/public/**", "/z/public2/hello.txt", false],
            ["/z/public/**", "/z/z02589/hello.txt", false],
            ["/z/public/**", "/u/z/public/hello.txt", false],
            ["/PROD/**", "/PROD", true],
            ["/PROD/**", "/PROD/app/config.yaml", true],
            ["/PROD/**", "/PRODUCTION/app/config.yaml", false],
            ["/bin/**", "/bin", true],
            ["/bin/**", "/bin/sh", true],
            ["/bin/**", "/usr/bin/sh", false],
            ["/etc/**", "/etc/profile", true],
            ["/etc/**", "/etc/ssh/sshd_config", true],
            ["/www/**", "/www/index.html", true],
            ["/www/**", "/www/zxplore/images/logo.png", true],
        ])("%s matches %s: %s", (glob, path, expected) => {
            expect(matches(glob, path)).toBe(expected);
        });
    });

    describe("path without wildcards", () => {
        it.each([
            ["/z/public", "/z/public", true],
            ["/z/public", "/z/public/hello.txt", false],
            ["/z/public", "/z/publicity", false],
            ["/etc/profile", "/etc/profile", true],
            ["/etc/profile", "/etc/profile.bak", false],
            ["/", "/", true],
            ["/", "/bin", false],
        ])("%s matches %s: %s", (glob, path, expected) => {
            expect(matches(glob, path)).toBe(expected);
        });
    });

    describe("* wildcard (within one path segment)", () => {
        it.each([
            ["/z/*", "/z/z02589", true],
            ["/z/*", "/z/public", true],
            ["/z/*", "/z/z02589/hello.txt", false],
            ["/z/*", "/z", false],
            ["/z/z02589/*", "/z/z02589/hello.txt", true],
            ["/z/z02589/*", "/z/z02589/cobol", true],
            ["/z/z02589/*", "/z/z02589/cobol/hello.cbl", false],
            ["/z/z02589/*.cbl", "/z/z02589/hello.cbl", true],
            ["/z/z02589/*.cbl", "/z/z02589/cobol/hello.cbl", false],
            ["/z/z02589/*.cbl", "/z/z02589/hello.cpy", false],
            ["/z/z02589/*.cbl", "/z/z02589/hellocbl", false],
            ["/z/z02589/hello.*", "/z/z02589/hello.cbl", true],
            ["/z/z02589/hello.*", "/z/z02589/hello.jcl", true],
            ["/z/z02589/hello.*", "/z/z02589/goodbye.cbl", false],
            ["/usr/lpp/java/*/bin", "/usr/lpp/java/JDK21/bin", true],
            ["/usr/lpp/java/*/bin", "/usr/lpp/java/JDK21/lib/bin", false],
            ["/usr/lpp/java/*/bin", "/usr/lpp/java/bin", false],
            ["/z/*/public", "/z/z02589/public", true],
            ["/z/*/public", "/z/public", false],
        ])("%s matches %s: %s", (glob, path, expected) => {
            expect(matches(glob, path)).toBe(expected);
        });
    });

    describe("? wildcard (exactly one character within a path segment)", () => {
        it.each([
            ["/z/z0258?", "/z/z02589", true],
            ["/z/z0258?", "/z/z02580", true],
            ["/z/z0258?", "/z/z025899", false],
            ["/z/z0258?", "/z/z0258", false],
            ["/z/z0258?/**", "/z/z02589/hello.txt", true],
            ["/z/z?????/**", "/z/z02589/hello.txt", true],
            ["/z/z?????/**", "/z/public/hello.txt", false],
            ["/z/z02589/hello.??l", "/z/z02589/hello.cbl", true],
            ["/z/z02589/hello.??l", "/z/z02589/hello.jcl", true],
            ["/z/z02589/hello.??l", "/z/z02589/hello.cpy", false],
        ])("%s matches %s: %s", (glob, path, expected) => {
            expect(matches(glob, path)).toBe(expected);
        });

        it("does not let ? match the path separator", () => {
            expect(matches("/z?public", "/z/public")).toBe(false);
            expect(matches("/z/z0258?hello.txt", "/z/z0258/hello.txt")).toBe(false);
        });
    });

    describe("** wildcard (zero or more path segments)", () => {
        it.each([
            ["**", "/z/z02589/hello.txt", true],
            ["**", "/", true],
            ["/**", "/etc/profile", true],
            ["/**", "/", true],
            ["/usr/lpp/**/bin", "/usr/lpp/bin", true],
            ["/usr/lpp/**/bin", "/usr/lpp/java/JDK21/bin", true],
            ["/usr/lpp/**/bin", "/usr/lpp/java/JDK21/bin/java", false],
            ["/usr/lpp/**/bin", "/usr/lpp/java/JDK21/sbin", false],
            ["**/.profile", "/z/z02589/.profile", true],
            ["**/.profile", "/.profile", true],
            ["**/.profile", "/etc/profile", false],
            ["**/.profile", "/z/z02589/x.profile", false],
            ["/z/z02589/**/*.jcl", "/z/z02589/hello.jcl", true],
            ["/z/z02589/**/*.jcl", "/z/z02589/jcl/hello.jcl", true],
            ["/z/z02589/**/*.jcl", "/z/z02589/jcl/archive/hello.jcl", true],
            ["/z/z02589/**/*.jcl", "/z/z02589/hello.cbl", false],
            ["/z/z02589/**/*.jcl", "/z/public/hello.jcl", false],
            ["/**/bin/**", "/bin/sh", true],
            ["/**/bin/**", "/usr/lpp/java/JDK21/bin/java", true],
            ["/**/bin/**", "/z/z02589/hello.txt", false],
        ])("%s matches %s: %s", (glob, path, expected) => {
            expect(matches(glob, path)).toBe(expected);
        });

        it("treats ** that is not a whole path segment like *", () => {
            expect(matches("/z/z02589/cobol**", "/z/z02589/cobolold")).toBe(true);
            expect(matches("/z/z02589/cobol**", "/z/z02589/cobol/hello.cbl")).toBe(false);
            expect(matches("/z/**02589", "/z/z02589")).toBe(true);
            expect(matches("/z/**02589", "/z/public/z02589")).toBe(false);
        });
    });

    describe("case and special characters", () => {
        it("is case sensitive", () => {
            expect(matches("/PROD/**", "/prod/app/config.yaml")).toBe(false);
            expect(matches("/z/Z02589/**", "/z/z02589/hello.txt")).toBe(false);
            expect(matches("/z/z02589/*.CBL", "/z/z02589/hello.cbl")).toBe(false);
        });

        it.each([
            ["/z/z02589/notes(1).txt", "/z/z02589/notes(1).txt", true],
            ["/z/z02589/notes(1).txt", "/z/z02589/notes1.txt", false],
            ["/z/z02589/a+b.txt", "/z/z02589/a+b.txt", true],
            ["/z/z02589/a+b.txt", "/z/z02589/aab.txt", false],
            ["/z/z02589/$HOME", "/z/z02589/$HOME", true],
            ["/z/z02589/hello.txt", "/z/z02589/helloxtxt", false],
            ["/z/z02589/^start", "/z/z02589/^start", true],
            ["/z/z02589/end|pipe", "/z/z02589/end|pipe", true],
            ["/z/z02589/end|pipe", "/z/z02589/end", false],
        ])("%s matches %s: %s", (glob, path, expected) => {
            expect(matches(glob, path)).toBe(expected);
        });
    });
});

const ds = (path: string, query?: string): vscode.Uri => vscode.Uri.from({ scheme: ZoweScheme.DS, path, query });
const uss = (path: string, query?: string): vscode.Uri => vscode.Uri.from({ scheme: ZoweScheme.USS, path, query });

const zxploreRules = [
    { pattern: "ZXP.**" },
    { pattern: "SYS1.**" },
    { pattern: "Z02589.LOADLIB" },
    { pattern: "Z02589.JCL(PROD*)" },
    { uss: "/PROD/**" },
    { uss: "/bin/**" },
    { uss: "/etc/**" },
    { uss: "/www/**" },
    { profile: "zosmf", uss: "/usr/lpp/**" },
    { profile: "zosmf", pattern: "CEE.**" },
    { profile: "zosmf_prod" },
];

let getDirectValueSpy: ReturnType<typeof vi.spyOn>;
const useRules = (rules: unknown): void => {
    (ReadOnlyManagement as any).ruleCache = undefined;
    getDirectValueSpy = vi.spyOn(SettingsConfig, "getDirectValue").mockImplementation((key: string) => {
        return key === Constants.SETTINGS_READ_ONLY_RULES ? rules : undefined;
    });
};

describe("ReadOnlyManagement - isReadOnly with zowe.readOnly.rules", () => {
    beforeEach(() => {
        (ReadOnlyManagement as any).overrides.clear();
        useRules(zxploreRules);
    });

    afterEach(() => {
        (ReadOnlyManagement as any).ruleCache = undefined;
        vi.restoreAllMocks();
    });

    describe("data sets", () => {
        it.each([
            ["/zosmf/Z02589.JCL", false],
            ["/zosmf/Z02589.JCL/HELLO", false],
            ["/zosmf/Z02589.JCL/PRODJOB", true],
            ["/zosmf/Z02589.SOURCE", false],
            ["/zosmf/Z02589.SOURCE/HELLO", false],
            ["/zosmf/Z02589.LOADLIB", true],
            ["/zosmf/Z02589.LOADLIB/HELLO", true],
            ["/zosmf/Z02589.LOADLIB.BACKUP", true],
            ["/zosmf/Z02589.LOAD", false],
            ["/zosmf/ZXP.PUBLIC.JCL", true],
            ["/zosmf/ZXP.PUBLIC.JCL/README", true],
            ["/zosmf/ZXP.PUBLIC.SOURCE/HELLO", true],
            ["/zosmf/SYS1.PROCLIB", true],
            ["/zosmf/SYS1.PARMLIB/IEASYS00", true],
            ["/zosmf/CEE.SCEELKED", true],
            ["/zosmf", false],
        ])("%s is read-only: %s", (path, expected) => {
            expect(ReadOnlyManagement.isReadOnly(ds(path))).toBe(expected);
        });

        it("ignores the file extension added to data set and member URIs", () => {
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/PRODJOB.jcl"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO.jcl"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.CBL/HELLO.cbl"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.SOURCE.CBL/HELLO.cbl"))).toBe(false);
        });

        it("only applies profile-scoped rules to that profile", () => {
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/CEE.SCEELKED"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/ssh/CEE.SCEELKED"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/ssh/ZXP.PUBLIC.JCL"))).toBe(true);
        });

        it("matches profile names case sensitively", () => {
            expect(ReadOnlyManagement.isReadOnly(ds("/ZOSMF/CEE.SCEELKED"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/ZOSMF_PROD/Z02589.JCL"))).toBe(false);
        });

        it("makes everything in a profile read-only for a profile-only rule", () => {
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf_prod"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf_prod/Z02589.JCL"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf_prod/Z02589.JCL/HELLO"))).toBe(true);
        });

        it("does not apply USS rules to data sets", () => {
            useRules([{ uss: "/**" }]);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(false);
        });
    });

    describe("USS files and directories", () => {
        it.each([
            ["/zosmf/z/z02589", false],
            ["/zosmf/z/z02589/hello.txt", false],
            ["/zosmf/z/z02589/cobol/hello.cbl", false],
            ["/zosmf/z/public", false],
            ["/zosmf/z/public/hello.txt", false],
            ["/zosmf/PROD", true],
            ["/zosmf/PROD/app/config.yaml", true],
            ["/zosmf/prod/app/config.yaml", false],
            ["/zosmf/bin/sh", true],
            ["/zosmf/etc/profile", true],
            ["/zosmf/www/index.html", true],
            ["/zosmf/tmp/hello.txt", false],
            ["/zosmf/usr/lpp/java/JDK21/bin/java", true],
            ["/zosmf", false],
        ])("%s is read-only: %s", (path, expected) => {
            expect(ReadOnlyManagement.isReadOnly(uss(path))).toBe(expected);
        });

        it("only applies profile-scoped rules to that profile", () => {
            expect(ReadOnlyManagement.isReadOnly(uss("/ssh/usr/lpp/java/JDK21/bin/java"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(uss("/ssh/bin/sh"))).toBe(true);
        });

        it("makes everything in a profile read-only for a profile-only rule", () => {
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf_prod"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf_prod/z/z02589/hello.txt"))).toBe(true);
        });

        it("does not apply data set rules to USS", () => {
            useRules([{ pattern: "**" }]);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/hello.txt"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/ZXP/hello.txt"))).toBe(false);
        });
    });

    describe("rule setting edge cases", () => {
        it.each([
            ["no rules", []],
            ["an unset setting", undefined],
            ["a setting that is not an array", { pattern: "ZXP.**" }],
            ["empty and null rules", [null, {}]],
        ])("makes nothing read-only for %s", (_desc, rules) => {
            useRules(rules);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/bin/sh"))).toBe(false);
        });

        it("makes a resource read-only if any rule matches", () => {
            useRules([{ pattern: "Z02589.JCL" }, { pattern: "Z02589.LOADLIB" }]);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.LOADLIB"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.SOURCE"))).toBe(false);
        });

        it("applies a rule with both a data set pattern and a USS glob to both", () => {
            useRules([{ pattern: "ZXP.**", uss: "/z/public/**" }]);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/public/hello.txt"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/hello.txt"))).toBe(false);
        });
    });

    describe("other URIs", () => {
        it("is read-only for a readonly=true URI even if no rule matches", () => {
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO", "readonly=true"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/hello.txt", "readonly=true"))).toBe(true);
        });

        it("is not read-only for URIs outside the data set and USS file systems", () => {
            useRules([{ pattern: "**", uss: "/**" }]);
            expect(ReadOnlyManagement.isReadOnly(vscode.Uri.from({ scheme: ZoweScheme.Jobs, path: "/zosmf/Z02589/JOB01234" }))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(vscode.Uri.file("/z/z02589/hello.txt"))).toBe(false);
        });
    });

    describe("rule cache", () => {
        it("reads the setting once for repeated checks", () => {
            ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"));
            ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"));
            ReadOnlyManagement.isReadOnly(uss("/zosmf/bin/sh"));
            expect(getDirectValueSpy.mock.calls.filter(([key]) => key === Constants.SETTINGS_READ_ONLY_RULES)).toHaveLength(1);
        });

        it("uses the new rules after the setting changes", () => {
            let onConfigChange: (e: vscode.ConfigurationChangeEvent) => void;
            const configChangeMock = new MockedProperty(
                vscode.workspace,
                "onDidChangeConfiguration",
                undefined,
                vi.fn().mockImplementation((listener) => {
                    onConfigChange = listener;
                    return new vscode.Disposable(vi.fn());
                })
            );
            ReadOnlyManagement.initialize({ subscriptions: [] } as any);

            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(false);
            getDirectValueSpy.mockReturnValue([{ pattern: "Z02589.**" }]);
            onConfigChange({ affectsConfiguration: (key: string) => key === Constants.SETTINGS_READ_ONLY_RULES });
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(true);
            configChangeMock[Symbol.dispose]();
        });

        it("keeps the cached rules when an unrelated setting changes", () => {
            let onConfigChange: (e: vscode.ConfigurationChangeEvent) => void;
            const configChangeMock = new MockedProperty(
                vscode.workspace,
                "onDidChangeConfiguration",
                undefined,
                vi.fn().mockImplementation((listener) => {
                    onConfigChange = listener;
                    return new vscode.Disposable(vi.fn());
                })
            );
            ReadOnlyManagement.initialize({ subscriptions: [] } as any);

            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(false);
            getDirectValueSpy.mockReturnValue([{ pattern: "Z02589.**" }]);
            onConfigChange({ affectsConfiguration: (key: string) => key === "zowe.ds.paginate.dataSetsPerPage" });
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(false);
            configChangeMock[Symbol.dispose]();
        });
    });
});
