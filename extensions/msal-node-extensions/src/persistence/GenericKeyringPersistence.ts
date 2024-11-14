/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Entry } from "@napi-rs/keyring";
import { Logger, LoggerOptions } from "@azure/msal-common/node";
import { dirname } from "path";
import { isNodeError } from "../utils/TypeGuards.js";
import { PersistenceError } from "../error/PersistenceError.js";
import { BasePersistence } from "./BasePersistence.js";
import { IPersistence } from "./IPersistence.js";
import { FilePersistence } from "./FilePersistence.js";

/**
 * Reads and writes passwords from macOS keychain or Linux secret service.
 * This also supports Windows, but is not used on Windows by default.
 */
export class GenericKeyringPersistence
    extends BasePersistence
    implements IPersistence
{
    private readonly entry: Entry;
    private readonly filePersistence: FilePersistence;

    protected constructor(
        filePersistence: FilePersistence,
        readonly service: string,
        readonly account: string,
    ) {
        super();
        this.entry = new Entry(service, account);
        this.filePersistence = filePersistence;
    }

    /**
     * Reads and writes passwords from macOS keychain or Linux secret service.
     *
     * @param serviceName Identifier used as key for whatever value is stored
     * @param accountName Account under which password should be stored
     */
    public static async create(
        fileLocation: string,
        serviceName: string,
        accountName: string,
        loggerOptions?: LoggerOptions,
    ): Promise<GenericKeyringPersistence> {
        const filePersistence = await FilePersistence.create(
            fileLocation,
            loggerOptions,
        );

        return new GenericKeyringPersistence(
            filePersistence,
            serviceName,
            accountName,
        );
    }

    public async save(contents: string): Promise<void> {
        try {
            this.entry.setPassword(contents);
        } catch (e) {
            if (isNodeError(e)) {
                throw PersistenceError.createGenericKeyringPersistenceError(
                    e.message,
                );
            }
            throw e;
        }

        await this.filePersistence.save(contents);
    }

    public load(): Promise<string | null> {
        try {
            return Promise.resolve(this.entry.getPassword());
        } catch (e) {
            if (isNodeError(e)) {
                throw PersistenceError.createGenericKeyringPersistenceError(
                    e.message,
                );
            }
            throw e;
        }
    }

    public async delete(): Promise<boolean> {
        try {
            await this.filePersistence.delete();

            return this.entry.deletePassword();
        } catch (e) {
            if (isNodeError(e)) {
                throw PersistenceError.createGenericKeyringPersistenceError(
                    e.message,
                );
            }
            throw e;
        }
    }

    reloadNecessary(lastSync: number): Promise<boolean> {
        return this.filePersistence.reloadNecessary(lastSync);
    }

    getFilePath(): string {
        return this.filePersistence.getFilePath();
    }
    getLogger(): Logger {
        return this.filePersistence.getLogger();
    }

    createForPersistenceValidation(): Promise<IPersistence> {
        const testCacheFileLocation = `${dirname(
            this.filePersistence.getFilePath(),
        )}/test.cache`;
        return GenericKeyringPersistence.create(
            testCacheFileLocation,
            "persistenceValidationServiceName",
            "persistencValidationAccountName",
        );
    }
}
