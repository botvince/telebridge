import React, { FC, memo, useEffect } from '../../lib/teact/teact';
import { getDispatch, withGlobal } from '../../lib/teact/teactn';

import {
  ApiContact, ApiError, ApiInviteInfo, ApiPhoto,
} from '../../api/types';

import getReadableErrorText from '../../util/getReadableErrorText';
import { pick } from '../../util/iteratees';
import renderText from '../common/helpers/renderText';
import useLang from '../../hooks/useLang';
import useFlag from '../../hooks/useFlag';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../common/Avatar';

import '../main/Dialogs.scss';
import { BridgeState } from '../../global/types';
import InputText from '../ui/InputText';
import { ChangeEvent } from 'react';

type StateProps = {
    bridge: BridgeState
};

/**
 * + Bridge Password Dialog Component
 */

const PasswordDialog: FC<StateProps> = ({ bridge }) => {
    const { unlockBridge } = getDispatch();
    const [isModalOpen, openModal, closeModal] = useFlag();

    const lang = useLang();

    var noPassword: boolean = bridge.passwordControl === undefined;

    useEffect(() => {
        return; // PIN: Blocked for now
        if(noPassword || !bridge.unlocked){
            openModal();
        }
    }, [bridge, openModal]);

    function renderHeader(title: string) {
        return (
            <div className="modal-header">
            {/*photo && <Avatar size="small" photo={photo} />*/}
            <div className="modal-title">
                {renderText(title)}
            </div>
            <Button round color="translucent" size="smaller" ariaLabel={lang('Close')} onClick={closeModal}>
                <i className="icon-close" />
            </Button>
            </div>
        );
    }

    const handleClick = () => {
        if(noPassword) setPassword
        unlockBridge({password: enteredPassword});
        closeModal();
    }

    var enteredPassword = "";

    return (
        <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
            className="error"
            header={renderHeader(noPassword ? "Choose new Bridge Password" : "Enter Bridge Password")}
            //onCloseAnimationEnd={dismissDialog}
        >
            {/*<p className="modal-help">HELP</p>*/}
            <p className="modal-about">{renderText(
                (noPassword ? "Choose a new Bridge password to secure your keys! \n" : "") 
                + "This password is used to encrypt your local key cache. Remember to backup your keys!"
                , ['br']
            )}</p>
            
            <InputText
                placeholder='Bridge Password'
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                enteredPassword = e.target.value;
                //console.log("[BRIDGE] Entered Password:", enteredPassword);
                }}
                label={'Bridge Password'}
                password
                //disabled={isLoading}
                //error={error === ERROR_BIO_TOO_LONG ? error : undefined}
            />

            <Button isText className="confirm-dialog-button" onClick={handleClick}>
                Confirm
            </Button>
            <Button isText className="confirm-dialog-button" onClick={closeModal}>
                Cancel
            </Button>
        </Modal>
    );
};

function getErrorHeader(error: ApiError) {
  if (error.isSlowMode) {
    return 'Slowmode enabled';
  }

  if (!error.hasErrorKey) {
    return 'Telegram';
  }

  return 'Something went wrong';
}

export default memo(withGlobal(
  (global): StateProps => pick(global, ['bridge']),
)(PasswordDialog));
