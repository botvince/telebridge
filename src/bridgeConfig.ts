import {
    CipherGCMTypes,
    Encoding,
    BinaryToTextEncoding
} from 'crypto';

/**
 * + Bridge Config
 */

export const BRIDGE_CACHE_KEY = 'tt-bridge-cache';

export const ALGORITHM_SYMMETRIC: CipherGCMTypes = 'aes-256-gcm';
export const ALGORITHM_KEY_HASH = 'sha256';

export const ALGORITHM_ASYMMETRIC = undefined;

export const ENCODING_INPUT: Encoding = 'utf8';
export const ENCODING_ENCRYPTED: BinaryToTextEncoding = 'base64';
export const ENCODING_KEY_HASH: BinaryToTextEncoding = 'base64';

export const IV_LENGTH = 16  // AES required blocksize

export const ENCRYPTION_PREFIX = 'b';
export const CHECK_PREFIX = 'c';
export const KEY_CHECK = true;

export const COMMAND_KEYWORDS = ['!b', '!bridge'];