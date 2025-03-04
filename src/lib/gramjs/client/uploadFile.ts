// eslint-disable-next-line import/no-named-default
import { default as Api } from '../tl/api';

import TelegramClient from './TelegramClient';
import { generateRandomBytes, readBigIntFromBuffer, sleep } from '../Helpers';
import { getAppropriatedPartSize } from '../Utils';
import errors from '../errors';
import { addBufferStamp, encryptBuffer } from '../../../modules/helpers/bridgeCrypto';

interface OnProgress {
    isCanceled?: boolean;

    // Float between 0 and 1.
    (progress: number): void;
}

export interface UploadFileParams {
    file: File;
    workers: number;
    onProgress?: OnProgress;
    key?: string;
}

const KB_TO_BYTES = 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
const DISCONNECT_SLEEP = 1000;

export async function uploadFile(
    client: TelegramClient,
    fileParams: UploadFileParams,
): Promise<Api.InputFile | Api.InputFileBig> {

    //console.info("[BRIDGE] Called 'uploadFile' in uploadFile.ts");
    const { file, onProgress } = fileParams;
    let { workers, key } = fileParams;

    const { name } = file;
    var { size } = file;
    const fileId = readBigIntFromBuffer(generateRandomBytes(8), true, true);
    var buffer = Buffer.from(await fileToBuffer(file));

    //console.log("[BRIDGE] submitted data:", buffer, ", size:", size);

    //console.log("[BRIDGE] KEY IN UPLOAD:", key);
    //Encrypt outgoing data
    if(key) {
        buffer = encryptBuffer(addBufferStamp(buffer), key);
        size = buffer.byteLength;
        //console.log("[BRIDGE] uploading encrypted data:", buffer, ", size:", size);
        console.log("[BRIDGE] uploading encrypted data with size:", size);
    }else{
        console.log("[BRIDGE] not encrypting file!");
    }
    

    const isLarge = size > LARGE_FILE_THRESHOLD;

    const partSize = getAppropriatedPartSize(size) * KB_TO_BYTES;
    const partCount = Math.floor((size + partSize - 1) / partSize);

    // Make sure a new sender can be created before starting upload
    await client.getSender(client.session.dcId);

    if (!workers || !size) {
        workers = 1;
    }
    if (workers >= partCount) {
        workers = partCount;
    }

    let progress = 0;
    if (onProgress) {
        onProgress(progress);
    }

    for (let i = 0; i < partCount; i += workers) {
        const sendingParts = [];
        let end = i + workers;
        if (end > partCount) {
            end = partCount;
        }

        for (let j = i; j < end; j++) {
            const bytes = buffer.slice(j * partSize, (j + 1) * partSize);

            // eslint-disable-next-line no-loop-func
            sendingParts.push((async (jMemo: number, bytesMemo: Buffer) => {
                while (true) {
                    let sender;
                    try {
                        // We always upload from the DC we are in
                        sender = await client.getSender(client.session.dcId);
                        await sender.send(
                            isLarge
                                ? new Api.upload.SaveBigFilePart({
                                    fileId,
                                    filePart: jMemo,
                                    fileTotalParts: partCount,
                                    bytes: bytesMemo,
                                })
                                : new Api.upload.SaveFilePart({
                                    fileId,
                                    filePart: jMemo,
                                    bytes: bytesMemo,
                                }),
                        );
                    } catch (err) {
                        if (sender && !sender.isConnected()) {
                            await sleep(DISCONNECT_SLEEP);
                            continue;
                        } else if (err instanceof errors.FloodWaitError) {
                            await sleep(err.seconds * 1000);
                            continue;
                        }
                        throw err;
                    }

                    if (onProgress) {
                        if (onProgress.isCanceled) {
                            throw new Error('USER_CANCELED');
                        }

                        progress += (1 / partCount);
                        onProgress(progress);
                    }
                    break;
                }
            })(j, bytes));
        }

        await Promise.all(sendingParts);
    }

    return isLarge
        ? new Api.InputFileBig({
            id: fileId,
            parts: partCount,
            name,
        })
        : new Api.InputFile({
            id: fileId,
            parts: partCount,
            name,
            md5Checksum: '', // This is not a "flag", so not sure if we can make it optional.
        });
}

function fileToBuffer(file: File) {
    return new Response(file).arrayBuffer();
}
