import { GlobalState } from '../../global/types';
import { addReducer, getGlobal, setGlobal } from '../../lib/teact/teactn';
import { decryptText, encryptText, hashKey } from '../helpers/bridgeCrypto';

import { replaceSettings } from '../reducers';

/**
 *  + Bridge Reducers
 */

/**
 * Returns true if the password is valid when checked agains the password control word.
 * Always returns true if no password is set.
 * Always returns false if a password is set but none is given as parameter.
 */
function checkPassword(password?: string, passwordControl?: string){
    if(passwordControl && passwordControl.length > 0){
        if(!password) return false;
        //Check if password is correct with control word
        var controlWord = decryptText(passwordControl, password);
        if(password === controlWord){
            //Password correct
            return true;
        }else{
            //Password incorrect
            return false;
        }
    }else{
        //No password is set
        return true;
    }
}

addReducer('lockBridge', (global: GlobalState, actions, payload) => {
    global.bridge.privateKey = undefined;
    global.bridge.symKeys = {};
    global.bridge.unlocked = false;

    //console.log("[BRIDGE] LOCKED:", global.bridge);

    setGlobal(global);
})

addReducer('unlockBridge', (global: GlobalState, actions, payload) => {
    const { password } = payload;

    var correct = checkPassword(password, global.bridge.passwordControl);

    if(!correct){
        console.log("[BRIDGE] Incorrect password!");
        return;
    }

    global.bridge.password = password;

    if(global.bridge.encryptedPrivKey){
        global.bridge.privateKey = decryptText(global.bridge.encryptedPrivKey, password);
    }

    global.bridge.symKeys = {};
    if(global.bridge.encryptedSymKeys){
        for (const key in global.bridge.encryptedSymKeys) {
            if (Object.prototype.hasOwnProperty.call(global.bridge.encryptedSymKeys, key)) {
                const element = global.bridge.encryptedSymKeys[key];
                global.bridge.symKeys[key] = element;
            }
        }
    }

    global.bridge.unlocked = true;
    //console.log("[BRIDGE] UNLOCKED:", global.bridge);

    setGlobal(global);
})

addReducer('setBridgePassword', (global: GlobalState, actions, payload) => {
    if(!payload) return;
    const {newPassword, oldPassword} = payload;

    var pass = checkPassword(oldPassword, global.bridge.passwordControl);
    if(!pass){
        console.log("[BRIDGE] WARNING: Wrong password!");
        return;
    }

    //UNLOCK IF NECESSARY
    if(!global.bridge.unlocked){
        if(global.bridge.encryptedPrivKey){
            global.bridge.privateKey = decryptText(global.bridge.encryptedPrivKey, oldPassword);
        }
    
        global.bridge.symKeys = {};
        if(global.bridge.encryptedSymKeys){
            for (const key in global.bridge.encryptedSymKeys) {
                if (Object.prototype.hasOwnProperty.call(global.bridge.encryptedSymKeys, key)) {
                    const element = global.bridge.encryptedSymKeys[key];
                    if(element)
                        global.bridge.symKeys[key] = decryptText(element, oldPassword);
                }
            }
        }
    }

    global.bridge.password = newPassword;
    global.bridge.passwordControl = encryptText(newPassword, newPassword);

    //RELOCK:
    if(global.bridge.privateKey){
        global.bridge.encryptedPrivKey = encryptText(global.bridge.privateKey, newPassword);
    }

    global.bridge.encryptedSymKeys = {};
    if(global.bridge.symKeys){
        for (const key in global.bridge.symKeys) {
            if (Object.prototype.hasOwnProperty.call(global.bridge.symKeys, key)) {
                const element = global.bridge.symKeys[key];
                if(element)
                    global.bridge.encryptedSymKeys[key] = encryptText(element, newPassword);
            }
        }
    }
    

    setGlobal(global);
});

addReducer('setPrivateKey', (global: GlobalState, actions, payload) => {
    if(!payload) return;
    const { privateKey } = payload;
    global.bridge.privateKey = privateKey;
    setGlobal(global);
});

addReducer('loadBridgeSettings', (global, actions, payload) => {
    //const {} = payload;

    //setGlobal(global, {  })
});
