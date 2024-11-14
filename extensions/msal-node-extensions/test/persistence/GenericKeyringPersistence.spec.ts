/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { GenericKeyringPersistence } from "../../src/index.js";
import { FileSystemUtils } from "../util/FileSystemUtils.js";
import { Entry } from "@napi-rs/keyring";

jest.mock("@napi-rs/keyring", () => {
    const Entry = jest.fn();
    Entry.prototype = {
        setPassword: jest.fn(),
        getPassword: jest.fn(),
        deletePassword: jest.fn()
    };
    return { Entry };
});

describe("Test GenericKeyringPersistence", () => {
    const filePath = "./keyring-test.json";
    const serviceName = "testService";
    const accountName = "accountName";

    afterEach(async () => {
        await FileSystemUtils.cleanUpFile(filePath);
        jest.clearAllMocks();
    });

    test("exports a class", async () => {
        const persistence = await GenericKeyringPersistence.create(
            filePath,
            serviceName,
            accountName
        );
        expect(persistence).toBeInstanceOf(GenericKeyringPersistence);
    });

    test("creates a cache persistence if doesnt exist", async () => {
        await GenericKeyringPersistence.create(filePath, serviceName, accountName);
        expect(await FileSystemUtils.doesFileExist(filePath)).toBe(true);
    });

    test("Returns correct persistence path", async () => {
        const persistence = await GenericKeyringPersistence.create(
            filePath,
            serviceName,
            accountName
        );
        expect(persistence.getFilePath()).toEqual(filePath);
    });

    test("Saves and loads contents", async () => {
        const persistence = await GenericKeyringPersistence.create(
            filePath,
            serviceName,
            accountName
        );
        const contents = "test";
        await persistence.load();
        await persistence.save(contents);

        expect(Entry).toHaveBeenCalledWith(serviceName, accountName);
        expect(Entry.prototype.setPassword).toHaveBeenCalledTimes(1);
        expect(Entry.prototype.setPassword).toHaveBeenCalledWith(contents);
        expect(Entry.prototype.getPassword).toHaveBeenCalledTimes(1);
    });

    test("deletes persistence", async () => {
        const persistence = await GenericKeyringPersistence.create(
            filePath,
            serviceName,
            accountName
        );
        await persistence.delete();

        expect(Entry.prototype.deletePassword).toHaveBeenCalledTimes(1);
        expect(await FileSystemUtils.doesFileExist(filePath)).toBe(false);
    });

    test("Persistence modified, reload necessary", async () => {
        const persistence = await GenericKeyringPersistence.create(
            filePath,
            serviceName,
            accountName
        );
        expect(await persistence.reloadNecessary(0)).toBe(true);
    });

    test("Persistence not modified, reload not necessary", async () => {
        const persistence = await GenericKeyringPersistence.create(
            filePath,
            serviceName,
            accountName
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(await persistence.reloadNecessary(Date.now())).toBe(false);
    });
});
