import {
  ApiMediaFormat,
  ApiOnProgress,
  ApiParsedMedia,
  ApiPreparedMedia,
} from '../api/types';

import {
  DEBUG, MEDIA_CACHE_DISABLED, MEDIA_CACHE_NAME, MEDIA_CACHE_NAME_AVATARS,
} from '../config';
import { callApi, cancelApiProgress } from '../api/gramjs';
import * as cacheApi from './cacheApi';
import { fetchBlob } from './files';
import { IS_OPUS_SUPPORTED, IS_PROGRESSIVE_SUPPORTED, isWebpSupported } from './environment';
import { oggToWav } from './oggToWav';
import { webpToPng } from './webpToPng';
import { getGlobal } from '../lib/teact/teactn';
import { selectCurrentChat } from '../modules/selectors';

const asCacheApiType = {
  [ApiMediaFormat.BlobUrl]: cacheApi.Type.Blob,
  [ApiMediaFormat.Lottie]: cacheApi.Type.Blob,
  [ApiMediaFormat.Progressive]: undefined,
  [ApiMediaFormat.Stream]: undefined,
};

const PROGRESSIVE_URL_PREFIX = './progressive/';

const memoryCache = new Map<string, ApiPreparedMedia>();
const fetchPromises = new Map<string, Promise<ApiPreparedMedia | undefined>>();
const progressCallbacks = new Map<string, Map<string, ApiOnProgress>>();
const cancellableCallbacks = new Map<string, ApiOnProgress>();

export function fetch<T extends ApiMediaFormat>(
  url: string,
  mediaFormat: T,
  isHtmlAllowed = false,
  onProgress?: ApiOnProgress,
  callbackUniqueId?: string,
  key?: string,
): Promise<ApiPreparedMedia> {
  if (mediaFormat === ApiMediaFormat.Progressive) {
    return (
      IS_PROGRESSIVE_SUPPORTED
        ? getProgressive(url)
        : fetch(url, ApiMediaFormat.BlobUrl, isHtmlAllowed, onProgress, callbackUniqueId)
    ) as Promise<ApiPreparedMedia>;
  }

  if (!fetchPromises.has(url)) {
    const promise = fetchFromCacheOrRemote(url, mediaFormat, isHtmlAllowed)
      .catch((err) => {
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.warn(err);
        }

        return undefined;
      })
      .finally(() => {
        fetchPromises.delete(url);
        progressCallbacks.delete(url);
        cancellableCallbacks.delete(url);
      });

    fetchPromises.set(url, promise);
  }

  if (onProgress && callbackUniqueId) {
    let activeCallbacks = progressCallbacks.get(url);
    if (!activeCallbacks) {
      activeCallbacks = new Map<string, ApiOnProgress>();
      progressCallbacks.set(url, activeCallbacks);
    }
    activeCallbacks.set(callbackUniqueId, onProgress);
  }

  return fetchPromises.get(url) as Promise<ApiPreparedMedia>;
}

export function getFromMemory(url: string) {
  return memoryCache.get(url) as ApiPreparedMedia;
}

export function cancelProgress(progressCallback: ApiOnProgress) {
  progressCallbacks.forEach((map, url) => {
    map.forEach((callback) => {
      if (callback === progressCallback) {
        const parentCallback = cancellableCallbacks.get(url);
        if (!parentCallback) return;

        cancelApiProgress(parentCallback);
        cancellableCallbacks.delete(url);
        progressCallbacks.delete(url);
      }
    });
  });
}

export function removeCallback(url: string, callbackUniqueId: string) {
  const callbacks = progressCallbacks.get(url);
  if (!callbacks) return;
  callbacks.delete(callbackUniqueId);
}

function getProgressive(url: string) {
  const progressiveUrl = `${PROGRESSIVE_URL_PREFIX}${url}`;

  memoryCache.set(url, progressiveUrl);

  return Promise.resolve(progressiveUrl);
}

async function fetchFromCacheOrRemote(
  url: string, mediaFormat: ApiMediaFormat, isHtmlAllowed: boolean,
) {

  var key: any;
  const global = getGlobal();
  var chat = selectCurrentChat(global);
  if(global.bridge.symKeys && chat){
    key = global.bridge.symKeys[chat.id];
    //console.log("[BRIDGE] Found Key by currentChat:", key);
  }

  if (!MEDIA_CACHE_DISABLED) {
    const cacheName = url.startsWith('avatar') ? MEDIA_CACHE_NAME_AVATARS : MEDIA_CACHE_NAME;
    const cached = await cacheApi.fetch(cacheName, url, asCacheApiType[mediaFormat]!, isHtmlAllowed);

    if (cached) {
      let media = cached;

      if (cached.type === 'audio/ogg' && !IS_OPUS_SUPPORTED) {
        media = await oggToWav(media);
      }

      if (cached.type === 'image/webp' && !isWebpSupported() && media) {
        const mediaPng = await webpToPng(url, media);
        if (mediaPng) {
          media = mediaPng;
        }
      }

      const prepared = prepareMedia(media);

      memoryCache.set(url, prepared);

      return prepared;
    }
  }
  //console.log("[BRIDGE] possible downloadMedia Api Call in fetchFromCacheOrRemote in mediaLoader.ts");

  if (mediaFormat === ApiMediaFormat.Stream) {
    const mediaSource = new MediaSource();
    const streamUrl = URL.createObjectURL(mediaSource);
    let isOpen = false;

    mediaSource.addEventListener('sourceopen', () => {
      if (isOpen) {
        return;
      }
      isOpen = true;

      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');

      const onProgress = makeOnProgress(url, mediaSource, sourceBuffer);
      cancellableCallbacks.set(url, onProgress);

      void callApi('downloadMedia', { url, mediaFormat, key }, onProgress);
    });

    memoryCache.set(url, streamUrl);
    return streamUrl;
  }

  const onProgress = makeOnProgress(url);
  cancellableCallbacks.set(url, onProgress);

  const remote = await callApi('downloadMedia', { url, mediaFormat, isHtmlAllowed, key }, onProgress);
  if (!remote) {
    throw new Error(`Failed to fetch media ${url}`);
  }

  let { prepared, mimeType } = remote;

  if (mimeType === 'audio/ogg' && !IS_OPUS_SUPPORTED) {
    const blob = await fetchBlob(prepared as string);
    URL.revokeObjectURL(prepared as string);
    const media = await oggToWav(blob);
    prepared = prepareMedia(media);
    mimeType = media.type;
  }

  if (mimeType === 'image/webp' && !isWebpSupported()) {
    const blob = await fetchBlob(prepared as string);
    URL.revokeObjectURL(prepared as string);
    const media = await webpToPng(url, blob);
    if (media) {
      prepared = prepareMedia(media);
    }
  }

  memoryCache.set(url, prepared);

  return prepared;
}

function makeOnProgress(url: string, mediaSource?: MediaSource, sourceBuffer?: SourceBuffer) {
  const onProgress: ApiOnProgress = (progress: number, arrayBuffer: ArrayBuffer) => {
    progressCallbacks.get(url)?.forEach((callback) => {
      callback(progress);
      if (callback.isCanceled) onProgress.isCanceled = true;
    });

    if (progress === 1) {
      mediaSource?.endOfStream();
    }

    if (!arrayBuffer) {
      return;
    }

    sourceBuffer?.appendBuffer(arrayBuffer);
  };

  return onProgress;
}

function prepareMedia(mediaData: Exclude<ApiParsedMedia, ArrayBuffer>): ApiPreparedMedia {
  if (mediaData instanceof Blob) {
    return URL.createObjectURL(mediaData);
  }

  return mediaData;
}

if (IS_PROGRESSIVE_SUPPORTED) {
  navigator.serviceWorker.addEventListener('message', async (e) => {
    const { type, messageId, params } = e.data as {
      type: string;
      messageId: string;
      params: { url: string; start: number; end: number };
    };

    if (type !== 'requestPart') {
      return;
    }

    /**
     * Find current chat key and apply to api call to decrypt
     */
    var key;
    const global = getGlobal();
    var chat = selectCurrentChat(global);
    if(global.bridge.symKeys && chat){
      key = global.bridge.symKeys[chat.id];
      //console.log("[BRIDGE] Found Key by currentChat:", key);
    }
    //console.log("[BRIDGE] downloadMedia Api Call in prepareMedia in mediaLoader.ts");
    const result = await callApi('downloadMedia', { mediaFormat: ApiMediaFormat.Progressive, ...params, key });
    if (!result) {
      return;
    }

    const { arrayBuffer, mimeType, fullSize } = result;

    navigator.serviceWorker.controller!.postMessage({
      type: 'partResponse',
      messageId,
      result: {
        arrayBuffer,
        mimeType,
        fullSize,
      },
    }, [arrayBuffer!]);
  });
}
