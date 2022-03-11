import { ChangeEvent } from 'react';
import useDebounce from '../../hooks/useDebounce';
import React, {
  FC, memo, useCallback, useEffect,
} from '../../lib/teact/teact';
import { getDispatch, withGlobal } from '../../lib/teact/teactn';

import { SettingsScreens } from '../../types';

import useLang from '../../hooks/useLang';
import useHistoryBack from '../../hooks/useHistoryBack';

import InputText from '../ui/InputText';

type OwnProps = {
  isActive?: boolean;
  onScreenSelect: (screen: SettingsScreens) => void;
  onReset: () => void;
};

type StateProps = {
  privateKey: string;
};

/**
 * + Bridge Settings Component
 */

const SettingsBridge: FC<OwnProps & StateProps> = ({
  isActive,
  onScreenSelect,
  onReset,
  privateKey
}) => {
  const lang = useLang();

  const {
    loadBridgeSettings,
    setPrivateKey,
    saveSession
  } = getDispatch();

  useEffect(() => {
    loadBridgeSettings();
  }, [loadBridgeSettings]);


  useHistoryBack(isActive, onReset, onScreenSelect, SettingsScreens.Bridge);

  return (
    <div className="settings-content custom-scroll">
      <div className="settings-item">
        <h4 className="settings-item-header" dir={lang.isRtl ? 'rtl' : undefined}>
          Encryption Settings
        </h4>

        <InputText
            value={privateKey}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const {value} = e.target;
              //console.log("[BRIDGE] New PK Value:", value);
              setPrivateKey({privateKey: value});
              //saveSession();
            }}
            label={'Private Key'}
            //disabled={isLoading}
            //error={error === ERROR_BIO_TOO_LONG ? error : undefined}
          />
          
      </div>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    return {
      privateKey: String(global.bridge.privateKey)
    };
  },
)(SettingsBridge));
