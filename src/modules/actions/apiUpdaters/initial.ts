import {
  addReducer, getDispatch, getGlobal, setGlobal,
} from '../../../lib/teact/teactn';

import { GlobalState } from '../../../global/types';

import {
  ApiUpdate,
  ApiUpdateAuthorizationState,
  ApiUpdateAuthorizationError,
  ApiUpdateConnectionState,
  ApiUpdateSession,
  ApiUpdateCurrentUser, ApiUpdateServerTimeOffset, ApiUpdateBridgeKey,
} from '../../../api/types';
import { DEBUG, SESSION_USER_KEY } from '../../../config';
import { subscribe } from '../../../util/notifications';
import { updateUser } from '../../reducers';
import { setLanguage } from '../../../util/langProvider';
import { selectNotifySettings } from '../../selectors';
import { forceWebsync } from '../../../util/websync';
import { getShippingError } from '../../../util/getReadableErrorText';
import { encryptText } from '../../helpers/bridgeCrypto';

addReducer('apiUpdate', (global, actions, update: ApiUpdate) => {
  if (DEBUG) {
    if (update['@type'] !== 'updateUserStatus' && update['@type'] !== 'updateServerTimeOffset') {
      // eslint-disable-next-line no-console
      console.log('[GramJs] UPDATE', update['@type'], { update });
    }
  }

  switch (update['@type']) {
    case 'updateBridgeKey':
      onUpdateBridgeKey(update);
      break;

    case 'updateApiReady':
      onUpdateApiReady(global);
      break;

    case 'updateAuthorizationState':
      onUpdateAuthorizationState(update);
      break;

    case 'updateAuthorizationError':
      onUpdateAuthorizationError(update);
      break;

    case 'updateConnectionState':
      onUpdateConnectionState(update);
      break;

    case 'updateSession':
      onUpdateSession(update);
      break;

    case 'updateServerTimeOffset':
      onUpdateServerTimeOffset(update);
      break;

    case 'updateCurrentUser':
      onUpdateCurrentUser(update);
      break;

    case 'error': {
      if (update.error.message === 'SESSION_REVOKED') {
        actions.signOut();
      }

      const paymentShippingError = getShippingError(update.error);
      if (paymentShippingError) {
        actions.addPaymentError({ error: paymentShippingError });
      } else if (actions.showDialog) {
        actions.showDialog({ data: update.error });
      }

      break;
    }
  }
});

function onUpdateBridgeKey(update: ApiUpdateBridgeKey) {
  let global = getGlobal();

  var password = global.bridge.password;
  
  if(!update.key){
    console.log("[BRIDGE] UpdateBridgeKey: NO KEY GIVEN.");
    return;
  }
  if(!global.bridge.passwordControl || !password){
    console.log("[BRIDGE] UpdateBridgeKey: NO PASSWORD SET!");
    password = "";
    //return;
  }
  if(!global.bridge.unlocked){
    console.log("[BRIDGE] UpdateBridgeKey: NOT UNLOCKED!");
    //return;
  }
  if(!global.bridge.symKeys){
    global.bridge.symKeys = {};
  }

  var encryptedKey = encryptText(update.key, password);

  if(!update.chatId){
    // Set key as private key if no chat id is specified
    global.bridge.privateKey = update.key;
    global.bridge.encryptedPrivKey = encryptedKey;
  } else {
    global.bridge.symKeys[update.chatId] = update.key;
    if(!global.bridge.encryptedSymKeys) global.bridge.encryptedSymKeys = {};
    global.bridge.encryptedSymKeys[update.chatId] = encryptedKey;
  }

  //console.log("[BRIDGE] KEY UPDATE:", global.bridge);

  setGlobal(global);
}

function onUpdateApiReady(global: GlobalState) {
  const { hasWebNotifications, hasPushNotifications } = selectNotifySettings(global);
  if (hasWebNotifications && hasPushNotifications) {
    void subscribe();
  }
  void setLanguage(global.settings.byKey.language);
}

function onUpdateAuthorizationState(update: ApiUpdateAuthorizationState) {
  let global = getGlobal();

  const wasAuthReady = global.authState === 'authorizationStateReady';
  const authState = update.authorizationState;

  setGlobal({
    ...global,
    authState,
    authIsLoading: false,
  });

  global = getGlobal();

  switch (authState) {
    case 'authorizationStateLoggingOut':
      void forceWebsync(false);

      setGlobal({
        ...global,
        isLoggingOut: true,
      });
      break;
    case 'authorizationStateWaitCode':
      setGlobal({
        ...global,
        authIsCodeViaApp: update.isCodeViaApp,
      });
      break;
    case 'authorizationStateWaitPassword':
      setGlobal({
        ...global,
        authHint: update.hint,
      });
      break;
    case 'authorizationStateWaitQrCode':
      setGlobal({
        ...global,
        authIsLoadingQrCode: false,
        authQrCode: update.qrCode,
      });
      break;
    case 'authorizationStateReady': {
      if (wasAuthReady) {
        break;
      }

      void forceWebsync(true);

      setGlobal({
        ...global,
        isLoggingOut: false,
      });

      break;
    }
  }
}

function onUpdateAuthorizationError(update: ApiUpdateAuthorizationError) {
  setGlobal({
    ...getGlobal(),
    authError: update.message,
  });
}

function onUpdateConnectionState(update: ApiUpdateConnectionState) {
  const { connectionState } = update;
  const global = getGlobal();

  if (connectionState === global.connectionState) {
    return;
  }

  setGlobal({
    ...global,
    connectionState,
  });

  if (connectionState === 'connectionStateBroken') {
    getDispatch().signOut();
  }
}

function onUpdateSession(update: ApiUpdateSession) {
  const { sessionData } = update;
  const { authRememberMe, authState } = getGlobal();
  const isEmpty = !sessionData || !sessionData.mainDcId;

  if (!authRememberMe || authState !== 'authorizationStateReady' || isEmpty) {
    return;
  }

  getDispatch().saveSession({ sessionData });
}

function onUpdateServerTimeOffset(update: ApiUpdateServerTimeOffset) {
  const global = getGlobal();

  if (global.serverTimeOffset === update.serverTimeOffset) {
    return;
  }

  setGlobal({
    ...global,
    serverTimeOffset: update.serverTimeOffset,
  });
}

function onUpdateCurrentUser(update: ApiUpdateCurrentUser) {
  const { currentUser } = update;

  setGlobal({
    ...updateUser(getGlobal(), currentUser.id, currentUser),
    currentUserId: currentUser.id,
  });

  updateSessionUserId(currentUser.id);
}

function updateSessionUserId(currentUserId: string) {
  const sessionUserAuth = localStorage.getItem(SESSION_USER_KEY);
  if (!sessionUserAuth) return;

  const userAuth = JSON.parse(sessionUserAuth);
  userAuth.id = currentUserId;

  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(userAuth));
}
