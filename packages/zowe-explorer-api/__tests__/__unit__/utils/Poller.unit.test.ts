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

import { Poller } from "../../../src/utils/Poller";

describe("Poller - unit tests", () => {
    beforeEach(() => {
        Object.keys(Poller.pollRequests).forEach((key) => {
            delete Poller.pollRequests[key];
        });
    });

    afterEach(() => {
        Object.keys(Poller.pollRequests).forEach((key) => {
            delete Poller.pollRequests[key];
        });
    });

    describe("stopAllPolling", () => {
        it("should mark all poll requests for disposal", () => {
            Poller.pollRequests["test1"] = {
                msInterval: 1000,
                dispose: false,
                request: jest.fn(),
            };
            Poller.pollRequests["test2"] = {
                msInterval: 2000,
                dispose: false,
                request: jest.fn(),
            };
            Poller.pollRequests["test3"] = {
                msInterval: 3000,
                request: jest.fn(),
            };

            Poller.stopAllPolling();

            expect(Poller.pollRequests["test1"].dispose).toBe(true);
            expect(Poller.pollRequests["test2"].dispose).toBe(true);
            expect(Poller.pollRequests["test3"].dispose).toBe(true);
        });

        it("should handle empty poll requests gracefully", () => {
            expect(Object.keys(Poller.pollRequests)).toHaveLength(0);

            expect(() => Poller.stopAllPolling()).not.toThrow();

            expect(Object.keys(Poller.pollRequests)).toHaveLength(0);
        });
    });

    describe("addRequest", () => {
        it("should add a poll request", () => {
            const testRequest = {
                msInterval: 1000,
                request: jest.fn(),
            };

            Poller.addRequest("test", testRequest);

            expect(Poller.pollRequests["test"]).toBeDefined();
            expect(Poller.pollRequests["test"].msInterval).toBe(1000);
        });
    });

    describe("removeRequest", () => {
        it("should remove a poll request", () => {
            Poller.pollRequests["test"] = {
                msInterval: 1000,
                request: jest.fn(),
            };

            Poller.removeRequest("test");

            expect(Poller.pollRequests["test"]).toBeUndefined();
        });
    });
});
