/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FilePersistenceWithDataProtection } from "./FilePersistenceWithDataProtection.js";
import { GenericKeyringPersistence } from "./GenericKeyringPersistence.js";
import { DataProtectionScope } from "./DataProtectionScope.js";
import { Environment } from "../utils/Environment.js";
import { IPersistence } from "./IPersistence.js";
import { FilePersistence } from "./FilePersistence.js";
import { PersistenceError } from "../error/PersistenceError.js";
import { IPersistenceConfiguration } from "./IPersistenceConfiguration.js";

export class PersistenceCreator {
    static async createPersistence(
        config: IPersistenceConfiguration
    ): Promise<IPersistence> {
        let peristence: IPersistence;

        // On Windows, uses a DPAPI encrypted file
        if (Environment.isWindowsPlatform()) {
            if (!config.cachePath || !config.dataProtectionScope) {
                throw PersistenceError.createPersistenceNotValidatedError(
                    "Cache path and/or data protection scope not provided for the FilePersistenceWithDataProtection cache plugin"
                );
            }

            peristence = await FilePersistenceWithDataProtection.create(
                config.cachePath,
                DataProtectionScope.CurrentUser,
                undefined,
                config.loggerOptions
            );
        }

        // On Mac, uses keychain. On Linux, uses secret service.
        else if (Environment.isMacPlatform() || Environment.isLinuxPlatform()) {
            if (
                !config.cachePath ||
                !config.serviceName ||
                !config.accountName
            ) {
                throw PersistenceError.createPersistenceNotValidatedError(
                    "Cache path, service name and/or account name not provided"
                );
            }

            peristence = await GenericKeyringPersistence.create(
                config.cachePath,
                config.serviceName,
                config.accountName,
                config.loggerOptions
            );
        } else {
            throw PersistenceError.createNotSupportedError(
                "The current environment is not supported by msal-node-extensions yet."
            );
        }

        try {
            await peristence.verifyPersistence();
        } catch (e) {
            if (
                Environment.isLinuxPlatform() &&
                config.usePlaintextFileOnLinux
            ) {
                if (!config.cachePath) {
                    throw PersistenceError.createPersistenceNotValidatedError(
                        "Cache path not provided for the FilePersistence cache plugin"
                    );
                }

                peristence = await FilePersistence.create(
                    config.cachePath,
                    config.loggerOptions
                );

                const isFilePersistenceVerified =
                    await peristence.verifyPersistence();
                if (isFilePersistenceVerified) {
                    return peristence;
                }

                throw PersistenceError.createPersistenceNotVerifiedError(
                    "Persistence could not be verified"
                );
            } else {
                throw e;
            }
        }

        return peristence;
    }
}
