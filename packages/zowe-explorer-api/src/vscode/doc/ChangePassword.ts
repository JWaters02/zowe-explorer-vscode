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

import { BaseProfileAuthOptions } from "./BaseProfileAuth";

/**
 * Interface containing the properties used to change a password on the remote system
 */
export interface ChangePasswordOptions extends Pick<BaseProfileAuthOptions, "serviceProfile" | "profileNode" | "zeProfiles" | "zeRegister"> {
    /**
     * Whether to store the new password securely. Defaults to whether the credential manager is available.
     */
    secure?: boolean;
}

/**
 * V4: Combine BaseProfileAuthOptions and ChangePasswordOptions in a smarter way e.g:
 */
// export interface ProfileOperationOptions {
//     serviceProfile: string | imperative.IProfileLoaded;
//     profileNode?: Types.IZoweNodeType;
//     zeProfiles?: ProfilesCache;
//     zeRegister?: Types.IApiRegisterClient;
// }

// export interface BaseProfileAuthOptions extends ProfileOperationOptions {
//     defaultTokenType?: string;
//     preferBaseToken?: boolean;
// }

// export interface ChangePasswordOptions extends ProfileOperationOptions {
//     secure?: boolean;
// }
