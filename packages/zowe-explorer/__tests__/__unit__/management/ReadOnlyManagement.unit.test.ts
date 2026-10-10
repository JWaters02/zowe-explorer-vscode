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
import { IZoweTreeNode, ZoweScheme } from "@zowe/zowe-explorer-api";
import { ReadOnlyManagement } from "../../../src/management/ReadOnlyManagement";
import { SettingsConfig } from "../../../src/configuration/SettingsConfig";
import { Constants } from "../../../src/configuration/Constants";
import { MockedProperty } from "../../__mocks__/mockUtils";
import { ZoweLocalStorage } from "../../../src/tools/ZoweLocalStorage";

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

const resetState = (): void => {
    (ReadOnlyManagement as any).overrides.clear();
    useRules(zxploreRules);
};

const treeNode = (uri: vscode.Uri | undefined, contextValue: string | undefined, extra: Partial<IZoweTreeNode> = {}): IZoweTreeNode =>
    ({ label: uri?.path.split("/").pop(), resourceUri: uri, contextValue, ...extra }) as IZoweTreeNode;

describe("ReadOnlyManagement - isSupportedUri", () => {
    it.each([
        ["a data set", ds("/zosmf/Z02589.JCL"), true],
        ["a PDS member", ds("/zosmf/Z02589.JCL/HELLO"), true],
        ["a data set profile", ds("/zosmf"), true],
        ["a USS file", uss("/zosmf/z/z02589/hello.txt"), true],
        ["a USS profile", uss("/zosmf"), true],
        ["a job spool file", vscode.Uri.from({ scheme: ZoweScheme.Jobs, path: "/zosmf/Z02589/JOB01234/JES2.JESMSGLG.2" }), false],
        ["a local file", vscode.Uri.file("/z/z02589/hello.txt"), false],
        ["an untitled document", vscode.Uri.from({ scheme: "untitled", path: "Untitled-1" }), false],
        ["an undefined URI", undefined, false],
    ])("for %s returns %s", (_desc, uri, expected) => {
        expect(ReadOnlyManagement.isSupportedUri(uri as vscode.Uri)).toBe(expected);
    });
});

describe("ReadOnlyManagement - applyPermission", () => {
    const fileStat = (): vscode.FileStat => ({ type: vscode.FileType.File, ctime: 1, mtime: 2, size: 3 });
    const dirStat = (): vscode.FileStat => ({ type: vscode.FileType.Directory, ctime: 1, mtime: 2, size: 0 });

    beforeEach(resetState);
    afterEach(() => {
        (ReadOnlyManagement as any).ruleCache = undefined;
        vi.restoreAllMocks();
    });

    it("marks a read-only file as read-only and keeps its other stats", () => {
        const stat = fileStat();
        expect(ReadOnlyManagement.applyPermission(ds("/zosmf/ZXP.PUBLIC.JCL/README"), stat)).toStrictEqual({
            ...stat,
            permissions: vscode.FilePermission.Readonly,
        });
    });

    it("does not modify the original stat object", () => {
        const stat = fileStat();
        ReadOnlyManagement.applyPermission(uss("/zosmf/bin/sh"), stat);
        expect(stat.permissions).toBeUndefined();
    });

    it("returns the same stat for a writable file", () => {
        const stat = fileStat();
        expect(ReadOnlyManagement.applyPermission(ds("/zosmf/Z02589.JCL/HELLO"), stat)).toBe(stat);
        expect(ReadOnlyManagement.applyPermission(uss("/zosmf/z/z02589/hello.txt"), stat)).toBe(stat);
    });

    it("does not mark directories as read-only", () => {
        const stat = dirStat();
        expect(ReadOnlyManagement.applyPermission(ds("/zosmf/ZXP.PUBLIC.JCL"), stat)).toBe(stat);
        expect(ReadOnlyManagement.applyPermission(uss("/zosmf/etc"), stat)).toBe(stat);
    });

    it("marks a file opened from a readonly=true link as read-only", () => {
        expect(ReadOnlyManagement.applyPermission(ds("/zosmf/Z02589.JCL/HELLO", "readonly=true"), fileStat()).permissions).toBe(
            vscode.FilePermission.Readonly
        );
    });

    it("marks a file made read-only from the tree as read-only", () => {
        ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), true);
        expect(ReadOnlyManagement.applyPermission(ds("/zosmf/Z02589.JCL/HELLO"), fileStat()).permissions).toBe(vscode.FilePermission.Readonly);
    });

    it("returns a null or undefined stat as-is", () => {
        expect(ReadOnlyManagement.applyPermission(ds("/zosmf/ZXP.PUBLIC.JCL/README"), null as any)).toBeNull();
        expect(ReadOnlyManagement.applyPermission(ds("/zosmf/ZXP.PUBLIC.JCL/README"), undefined as any)).toBeUndefined();
    });

    it("returns the stat as-is for URIs outside the data set and USS file systems", () => {
        const stat = fileStat();
        expect(ReadOnlyManagement.applyPermission(vscode.Uri.file("/bin/sh"), stat)).toBe(stat);
    });
});

describe("ReadOnlyManagement - setReadOnly", () => {
    beforeEach(resetState);
    afterEach(() => {
        (ReadOnlyManagement as any).ruleCache = undefined;
        vi.restoreAllMocks();
    });

    describe("data sets", () => {
        it("makes a writable PDS and its members read-only", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.SOURCE/HELLO"))).toBe(false);
        });

        it("makes a PDS that a rule makes read-only writable, along with its members", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL/README"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.SOURCE/HELLO"))).toBe(true);
        });

        it("makes a single member read-only without affecting the other members", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL/HELLO"), true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/COMPILE"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(false);
        });

        it("lets a member override its PDS", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), true);
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL/HELLO"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/COMPILE"))).toBe(true);
        });

        it("clears member overrides when their PDS is changed", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL/HELLO"), false);
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL/COMPILE"), true);
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/COMPILE"))).toBe(true);
        });

        it("does not treat data sets with more qualifiers as children", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL.BACKUP"), true);
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL.BACKUP"))).toBe(true);

            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL.BACKUP/HELLO"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCLLIB"))).toBe(false);
        });

        it("lets a member override a member rule", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL/PRODJOB"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/PRODJOB"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/PRODRUN"))).toBe(true);
        });

        it("ignores the file extension added to member URIs", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL/HELLO.jcl"), true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(true);

            ReadOnlyManagement.setReadOnly(ds("/zosmf/ZXP.PUBLIC.CBL/HELLO"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.CBL/HELLO.cbl"))).toBe(false);
        });

        it("makes everything in a profile read-only, then back to what the rules decide", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf"), true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/ssh/Z02589.JCL/HELLO"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/hello.txt"))).toBe(false);

            ReadOnlyManagement.setReadOnly(ds("/zosmf"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL/README"))).toBe(true);
        });

        it("makes a profile that a profile rule makes read-only writable", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf_prod"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf_prod/Z02589.JCL/HELLO"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf_prod/z/z02589/hello.txt"))).toBe(true);
        });
    });

    describe("USS", () => {
        it("makes a writable directory and everything in it read-only", () => {
            ReadOnlyManagement.setReadOnly(uss("/zosmf/z/z02589/cobol"), true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/cobol"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/cobol/hello.cbl"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/cobol/copybooks/record.cpy"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/hello.txt"))).toBe(false);
        });

        it("makes a directory that a rule makes read-only writable", () => {
            ReadOnlyManagement.setReadOnly(uss("/zosmf/PROD"), false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/PROD/app/config.yaml"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/bin/sh"))).toBe(true);
        });

        it("does not treat directories with the same prefix as children", () => {
            ReadOnlyManagement.setReadOnly(uss("/zosmf/z/public"), true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/publicity/hello.txt"))).toBe(false);
        });

        it("lets a file override its directory", () => {
            ReadOnlyManagement.setReadOnly(uss("/zosmf/etc/profile"), false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/etc/profile"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/etc/ssh/sshd_config"))).toBe(true);
        });

        it("clears file overrides when their directory is changed", () => {
            ReadOnlyManagement.setReadOnly(uss("/zosmf/z/z02589/hello.txt"), true);
            ReadOnlyManagement.setReadOnly(uss("/zosmf/z/z02589"), false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/hello.txt"))).toBe(false);
        });

        it("keeps data set and USS overrides separate for the same profile", () => {
            ReadOnlyManagement.setReadOnly(uss("/zosmf"), true);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/hello.txt"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(false);
        });
    });

    describe("override lifecycle", () => {
        it("does not store an override when the resource is already in the requested state", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), false);
            ReadOnlyManagement.setReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"), true);
            expect((ReadOnlyManagement as any).overrides.size).toBe(0);

            // With no override stored, later rule changes still apply
            useRules([{ pattern: "Z02589.**" }]);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"))).toBe(false);
        });

        it("removes the override when a resource is changed back", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), true);
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL"))).toBe(false);
            expect((ReadOnlyManagement as any).overrides.size).toBe(0);
        });

        it("keeps overrides in place when the rules change", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"), false);
            ReadOnlyManagement.setReadOnly(uss("/zosmf/z/z02589"), true);
            useRules([]);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/ZXP.PUBLIC.JCL"))).toBe(false);
            expect(ReadOnlyManagement.isReadOnly(uss("/zosmf/z/z02589/hello.txt"))).toBe(true);
        });

        it("does not let an override make a readonly=true link writable", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL/HELLO", "readonly=true"), false);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO", "readonly=true"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(false);
        });

        it("ignores the query when storing an override", () => {
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL/HELLO", "readonly=true"), true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO"))).toBe(true);
            expect(ReadOnlyManagement.isReadOnly(ds("/zosmf/Z02589.JCL/HELLO", "fetch=true"))).toBe(true);
        });

        it("only keeps overrides for the current session", () => {
            const setValueSpy = vi.spyOn(ZoweLocalStorage, "setValue");
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), true);
            ReadOnlyManagement.setReadOnly(uss("/zosmf/PROD"), false);
            expect(setValueSpy).not.toHaveBeenCalled();
        });

        it("fires onDidChange once for each change", () => {
            const listener = vi.fn();
            const subscription = ReadOnlyManagement.onDidChange(listener);
            ReadOnlyManagement.setReadOnly(ds("/zosmf/Z02589.JCL"), true);
            ReadOnlyManagement.setReadOnly(uss("/zosmf/PROD"), false);
            expect(listener).toHaveBeenCalledTimes(2);
            subscription.dispose();
        });
    });
});

describe("ReadOnlyManagement - initialize and onDidChange", () => {
    let onConfigChange: (e: vscode.ConfigurationChangeEvent) => void;
    let configChangeMock: MockedProperty;
    const disposable = new vscode.Disposable(vi.fn());

    beforeEach(() => {
        resetState();
        configChangeMock = new MockedProperty(
            vscode.workspace,
            "onDidChangeConfiguration",
            undefined,
            vi.fn().mockImplementation((listener) => {
                onConfigChange = listener;
                return disposable;
            })
        );
    });

    afterEach(() => {
        configChangeMock[Symbol.dispose]();
        (ReadOnlyManagement as any).ruleCache = undefined;
        vi.restoreAllMocks();
    });

    it("registers its configuration listener with the extension context", () => {
        const context = { subscriptions: [] as vscode.Disposable[] };
        ReadOnlyManagement.initialize(context as any);
        expect(context.subscriptions).toContain(disposable);
    });

    it("fires onDidChange when the rules setting changes", () => {
        ReadOnlyManagement.initialize({ subscriptions: [] } as any);
        const listener = vi.fn();
        const subscription = ReadOnlyManagement.onDidChange(listener);
        onConfigChange({ affectsConfiguration: (key: string) => key === Constants.SETTINGS_READ_ONLY_RULES });
        expect(listener).toHaveBeenCalledTimes(1);
        subscription.dispose();
    });

    it("does not fire onDidChange when an unrelated setting changes", () => {
        ReadOnlyManagement.initialize({ subscriptions: [] } as any);
        const listener = vi.fn();
        const subscription = ReadOnlyManagement.onDidChange(listener);
        onConfigChange({ affectsConfiguration: (key: string) => key === "zowe.ds.default.sort" });
        expect(listener).not.toHaveBeenCalled();
        subscription.dispose();
    });

    it("fires onDidChange when notifyChanged is called", () => {
        const listener = vi.fn();
        const subscription = ReadOnlyManagement.onDidChange(listener);
        ReadOnlyManagement.notifyChanged();
        expect(listener).toHaveBeenCalledTimes(1);
        subscription.dispose();
    });
});

describe("ReadOnlyManagement - isEligibleNode", () => {
    it.each([
        ["a sequential data set", ds("/zosmf/Z02589.OUTPUT"), Constants.DS_DS_CONTEXT],
        ["a binary sequential data set", ds("/zosmf/Z02589.LOAD.BIN"), Constants.DS_DS_BINARY_CONTEXT],
        ["a favorited sequential data set", ds("/zosmf/Z02589.OUTPUT"), Constants.DS_FAV_CONTEXT],
        ["a PDS", ds("/zosmf/Z02589.JCL"), Constants.DS_PDS_CONTEXT],
        ["a favorited PDS", ds("/zosmf/Z02589.JCL"), Constants.DS_PDS_CONTEXT + Constants.FAV_SUFFIX],
        ["a filtered PDS", ds("/zosmf/Z02589.JCL"), Constants.DS_PDS_CONTEXT + Constants.CONTEXT_PREFIX + Constants.FILTER_SEARCH],
        ["a PDS member", ds("/zosmf/Z02589.JCL/HELLO"), Constants.DS_MEMBER_CONTEXT],
        ["a binary PDS member", ds("/zosmf/Z02589.LOADLIB/HELLO"), Constants.DS_MEMBER_BINARY_CONTEXT],
        ["a data set profile", ds("/zosmf"), Constants.DS_SESSION_CONTEXT + Constants.ACTIVE_CONTEXT],
        ["a favorited data set profile", ds("/zosmf"), Constants.DS_SESSION_FAV_CONTEXT],
        ["a USS profile", uss("/zosmf"), Constants.USS_SESSION_CONTEXT + Constants.ACTIVE_CONTEXT],
        ["a filtered USS profile", uss("/zosmf"), Constants.USS_SESSION_CONTEXT + Constants.CONTEXT_PREFIX + Constants.FILTER_SEARCH],
        ["a USS directory", uss("/zosmf/z/z02589/cobol"), Constants.USS_DIR_CONTEXT],
        ["a favorited USS directory", uss("/zosmf/z/z02589/cobol"), Constants.USS_FAV_DIR_CONTEXT],
        ["a USS text file", uss("/zosmf/z/z02589/hello.cbl"), Constants.USS_TEXT_FILE_CONTEXT],
        ["a favorited USS text file", uss("/zosmf/z/z02589/hello.cbl"), Constants.USS_FAV_TEXT_FILE_CONTEXT],
        ["a USS binary file", uss("/zosmf/z/z02589/hello"), Constants.USS_BINARY_FILE_CONTEXT],
    ])("returns true for %s", (_desc, uri, contextValue) => {
        expect(ReadOnlyManagement.isEligibleNode(treeNode(uri, contextValue))).toBe(true);
    });

    it.each([
        ["a VSAM data set", ds("/zosmf/Z02589.KSDS"), Constants.VSAM_CONTEXT],
        ["a migrated data set", ds("/zosmf/Z02589.OLD.JCL"), Constants.DS_MIGRATED_FILE_CONTEXT],
        ["a member that failed to load", ds("/zosmf/Z02589.JCL/BROKEN"), Constants.DS_FILE_ERROR_MEMBER_CONTEXT],
        ["an information placeholder", ds("/zosmf/Z02589.JCL"), Constants.INFORMATION_CONTEXT],
        ["a jobs profile", vscode.Uri.from({ scheme: ZoweScheme.Jobs, path: "/zosmf" }), Constants.JOBS_SESSION_CONTEXT],
        ["a job", vscode.Uri.from({ scheme: ZoweScheme.Jobs, path: "/zosmf/JOB01234" }), Constants.JOBS_JOB_CONTEXT],
        ["a spool file", vscode.Uri.from({ scheme: ZoweScheme.Jobs, path: "/zosmf/JOB01234/JES2.JESMSGLG.2" }), Constants.JOBS_SPOOL_CONTEXT],
        ["a data set node without a resource URI", undefined, Constants.DS_PDS_CONTEXT],
        ["a data set node without a context value", ds("/zosmf/Z02589.JCL"), undefined],
    ])("returns false for %s", (_desc, uri, contextValue) => {
        expect(ReadOnlyManagement.isEligibleNode(treeNode(uri, contextValue))).toBe(false);
    });

    it("returns false for an undefined node", () => {
        expect(ReadOnlyManagement.isEligibleNode(undefined as any)).toBe(false);
    });
});

describe("ReadOnlyManagement - getTreeItem", () => {
    beforeEach(resetState);
    afterEach(() => {
        (ReadOnlyManagement as any).ruleCache = undefined;
        vi.restoreAllMocks();
    });

    it("returns the node itself if it is not eligible", () => {
        const node = treeNode(ds("/zosmf/Z02589.KSDS"), Constants.VSAM_CONTEXT);
        expect(ReadOnlyManagement.getTreeItem(node)).toBe(node);
    });

    it("adds the writable context to a writable node", () => {
        const item = ReadOnlyManagement.getTreeItem(treeNode(ds("/zosmf/Z02589.JCL"), Constants.DS_PDS_CONTEXT));
        expect(item.contextValue).toBe(Constants.DS_PDS_CONTEXT + Constants.WRITABLE_CONTEXT);
    });

    it("adds the read-only context to a node that a rule makes read-only", () => {
        const item = ReadOnlyManagement.getTreeItem(treeNode(ds("/zosmf/ZXP.PUBLIC.JCL"), Constants.DS_PDS_CONTEXT));
        expect(item.contextValue).toBe(Constants.DS_PDS_CONTEXT + Constants.READ_ONLY_CONTEXT);
    });

    it("adds the context after any existing suffixes", () => {
        const contextValue = Constants.USS_SESSION_CONTEXT + Constants.ACTIVE_CONTEXT;
        const item = ReadOnlyManagement.getTreeItem(treeNode(uss("/zosmf_prod"), contextValue));
        expect(item.contextValue).toBe(contextValue + Constants.READ_ONLY_CONTEXT);
    });

    it("reflects changes made with setReadOnly", () => {
        const node = treeNode(uss("/zosmf/z/z02589/hello.txt"), Constants.USS_TEXT_FILE_CONTEXT);
        expect(ReadOnlyManagement.getTreeItem(node).contextValue).toBe(Constants.USS_TEXT_FILE_CONTEXT + Constants.WRITABLE_CONTEXT);
        ReadOnlyManagement.setReadOnly(uss("/zosmf/z/z02589"), true);
        expect(ReadOnlyManagement.getTreeItem(node).contextValue).toBe(Constants.USS_TEXT_FILE_CONTEXT + Constants.READ_ONLY_CONTEXT);
    });

    it("does not change the node's own context value", () => {
        const node = treeNode(ds("/zosmf/ZXP.PUBLIC.JCL"), Constants.DS_PDS_CONTEXT);
        const item = ReadOnlyManagement.getTreeItem(node);
        expect(item).not.toBe(node);
        expect(node.contextValue).toBe(Constants.DS_PDS_CONTEXT);
    });

    it("copies the properties used to render the node", () => {
        const command = { command: "vscode.open", title: "", arguments: [ds("/zosmf/Z02589.JCL/HELLO")] };
        const iconPath = new vscode.ThemeIcon("file");
        const accessibilityInformation = { label: "HELLO member" };
        const node = treeNode(ds("/zosmf/Z02589.JCL/HELLO"), Constants.DS_MEMBER_CONTEXT, {
            label: "HELLO",
            id: "zosmf.Z02589.JCL.HELLO",
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            iconPath,
            description: "2026/10/10",
            tooltip: "Z02589.JCL(HELLO)",
            command,
            accessibilityInformation,
            checkboxState: 0,
        });

        const item = ReadOnlyManagement.getTreeItem(node);
        expect(item.label).toBe("HELLO");
        expect(item.id).toBe("zosmf.Z02589.JCL.HELLO");
        expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
        expect(item.iconPath).toBe(iconPath);
        expect(item.description).toBe("2026/10/10");
        expect(item.resourceUri).toBe(node.resourceUri);
        expect(item.tooltip).toBe("Z02589.JCL(HELLO)");
        expect(item.command).toBe(command);
        expect(item.accessibilityInformation).toBe(accessibilityInformation);
        expect(item.checkboxState).toBe(0);
    });
});
