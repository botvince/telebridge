import crypto from 'crypto';
import { 
    ALGORITHM_KEY_HASH, 
    ALGORITHM_SYMMETRIC, 
    ENCODING_ENCRYPTED, 
    ENCODING_INPUT, 
    ENCODING_KEY_HASH, 
    IV_LENGTH, 
    ENCRYPTION_PREFIX, 
    CHECK_PREFIX
} from '../../bridgeConfig';

type Bin = crypto.BinaryLike;
type CipherGCM = crypto.CipherGCMTypes;

const defaultBufferStamp = Buffer.from([0x00, 0x00]);

export type EncryptionStatus = 'encrypted' | 'not_encrypted' | 'wrong_key';

export function addBufferStamp(buffer: Buffer, stamp: Buffer = defaultBufferStamp){
    return Buffer.concat([stamp, buffer]);
}

export function removeBufferStamp(buffer: Buffer, stamp: Buffer = defaultBufferStamp){
    if(checkBufferStamp(buffer, stamp)){
        return Buffer.from(buffer.slice(stamp.byteLength));
    }else{
        return buffer;
    }
}

export function checkBufferStamp(buffer: Buffer, stamp: Buffer = defaultBufferStamp){
    for(var i = 0; i < stamp.byteLength; i++){
        if(buffer.at(i) !== stamp.at(i)) {
            return false;
        }
    }
    return true;
}

export function encryptBuffer(buffer: Buffer, key: string){
    var ivBuffer: Buffer = generateIV();

    var ivString: string = ivBuffer.toString('base64');
    var dataString: string = buffer.toString('base64');

    var encryptedString = encryptSym(dataString, hashKey(key), ivString, 'base64', 'base64');
    //console.log("[BRIDGE] Buffer Encrypted:", encryptedString);
    var encryptedBuffer = Buffer.from(encryptedString, 'base64');

    var completeBuffer: Buffer = Buffer.concat([ivBuffer, encryptedBuffer]);
    
    return completeBuffer;
}

export function decryptBuffer(encryptedBuffer: Buffer, key: string){
    var ivBuffer: Buffer = encryptedBuffer.slice(0, IV_LENGTH);
    var dataBuffer: Buffer = encryptedBuffer.slice(IV_LENGTH);

    var encryptedString: string = dataBuffer.toString('base64');
    var ivString: string = ivBuffer.toString('base64');

    var dataString: string = decryptSym(encryptedString, hashKey(key), ivString, 'base64', 'base64');
    //console.log("[BRIDGE] Buffer Decrypted:", dataString);
    var decryptedBuffer = Buffer.from(dataString, 'base64');
    
    return decryptedBuffer;
}

/**
 * + Bridge Encryption Function
 * feel free to improve lol
 * (uses polyfilled node crypto package)
 * 
 * Encrypted Message Format:
 * <ENCRYPTION_PREFIX>.<IV>.<ENCRYPTED_DATA>
 */

/**
 * Checks the text for the encryption prefix
 */
export function hasPrefix(text: string, prefix: string = ENCRYPTION_PREFIX): boolean {
    return text.split('.')[0] === prefix;
}

/**
 * Encrypts a text with the given key.
 * Returns a encrypted text in the correct format.
 */
export function encryptText(text: string, symKey: string, check?: boolean){
    var iv = generateIV();
    var ivText = iv.toString('base64');
    
    if(check) text = `${CHECK_PREFIX}.${text}`;

    var encryptedText = encryptSym(text, symKey, iv);

    return `${ENCRYPTION_PREFIX}.${ivText}.${encryptedText}`;
}

/**
 * Decrypt text if it is encrypted in the correct format. 
 * If it is not, returns original text.
 */
export function decryptText(encryptedText: string, symKey: string, check?: (correct: boolean) => void){
    var parts = encryptedText.split('.');
    if(parts.length === 3 && parts[0] === ENCRYPTION_PREFIX){
        var iv = Buffer.from(parts[1], 'base64');
        var encryptedData = parts[2];

        var decryptedText = decryptSym(encryptedData, symKey, iv);

        if(check) {
            if(decryptedText.startsWith(`${CHECK_PREFIX}.`)){
                decryptedText = decryptedText.slice(2);
                check(true);
            }else{
                decryptedText = `[WRONG KEY] ${decryptedText}`;
                check(false);
            }
        }

        return decryptedText;
    }else{
        //console.log("[BRIDGE WARNING] Text is not encrypted correctly:", encryptedText);
        return encryptedText;
    }
}

export function decryptTextConfirmEncryption(encryptedText: string, symKey: string)
: {text: string, status: EncryptionStatus}
{
    var parts = encryptedText.split('.');
    var encryptionStatus: EncryptionStatus;
    if(parts.length === 3 && parts[0] === ENCRYPTION_PREFIX){
        var iv = Buffer.from(parts[1], 'base64');
        var encryptedData = parts[2];

        var decryptedText = decryptSym(encryptedData, symKey, iv);

        if(decryptedText.startsWith(`${CHECK_PREFIX}.`)){
            decryptedText = decryptedText.slice(2);
            encryptionStatus = 'encrypted';
        }else{
            decryptedText = `[WRONG KEY] ${decryptedText}`;
            encryptionStatus = 'wrong_key';
        }

        return {text: decryptedText, status: encryptionStatus};
    }else{
        //console.log("[BRIDGE WARNING] Text is not encrypted correctly:", encryptedText);
        encryptionStatus = 'not_encrypted';
        return {text: encryptedText, status: encryptionStatus};
    }
}

/**
 * Generates random Initialization Vector
 */
export function generateIV() {
    return crypto.randomBytes(IV_LENGTH);
}

/**
 * Hashes a (key) string
 */
export function hashKey(key: string) {
    var hasher = crypto.createHash(ALGORITHM_KEY_HASH);
    hasher.update(key, ENCODING_INPUT);
    return hasher.digest(ENCODING_KEY_HASH);
}

/**
 * Encrypts the message with the given symmetric key and init vector
 */
export function encryptSym(
    message:string, 
    base64key:string, 
    initVector:Bin, 
    input_encoding: crypto.Encoding = ENCODING_INPUT, 
    output_encoding: crypto.Encoding = ENCODING_ENCRYPTED,
    hash_encoding: crypto.Encoding = ENCODING_KEY_HASH,
    algorithm:CipherGCM = ALGORITHM_SYMMETRIC,
    ) {
    var keyBuffer = Buffer.from(hashKey(base64key), hash_encoding);
    var cipher = crypto.createCipheriv(algorithm, keyBuffer, initVector);
    var encryptedData = cipher.update(message, input_encoding, output_encoding);
    encryptedData += cipher.final(output_encoding);
    return encryptedData;
}

/**
 * Decrypts the message with the given symmetric key and init vector
 */
export function decryptSym(
    encryptedString:string, 
    base64key:string, 
    initVector:Bin, 
    input_encoding: crypto.Encoding = ENCODING_ENCRYPTED, 
    output_encoding: crypto.Encoding = ENCODING_INPUT,
    hash_encoding: crypto.Encoding = ENCODING_KEY_HASH,
    algorithm:CipherGCM = ALGORITHM_SYMMETRIC) {
    var keyBuffer = Buffer.from(hashKey(base64key), hash_encoding);
    var decipher = crypto.createDecipheriv(algorithm, keyBuffer, initVector);
    var decryptedData = decipher.update(encryptedString, input_encoding, output_encoding);
    //decryptedData += decipher.final('utf8');
    return decryptedData;
}