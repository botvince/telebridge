import React, { FC, memo, useEffect } from '../../../lib/teact/teact';
import { getDispatch, withGlobal } from '../../../lib/teact/teactn';

import { SettingsScreens } from '../../../types';
import { ApiUser } from '../../../api/types';

import { selectUser } from '../../../modules/selectors';
import useLang from '../../../hooks/useLang';
import useHistoryBack from '../../../hooks/useHistoryBack';

import ListItem from '../../ui/ListItem';
import ProfileInfo from '../../common/ProfileInfo';
import ChatExtra from '../../common/ChatExtra';

type OwnProps = {
  isActive?: boolean;
  onScreenSelect: (screen: SettingsScreens) => void;
  onReset: () => void;
};

type StateProps = {
  currentUser?: ApiUser;
  lastSyncTime?: number;
};

const SettingsMain: FC<OwnProps & StateProps> = ({
  isActive,
  onScreenSelect,
  onReset,
  currentUser,
  lastSyncTime,
}) => {
  const { loadProfilePhotos } = getDispatch();

  const lang = useLang();
  const profileId = currentUser?.id;

  useEffect(() => {
    if (profileId && lastSyncTime) {
      loadProfilePhotos({ profileId });
    }
  }, [lastSyncTime, profileId, loadProfilePhotos]);

  useHistoryBack(isActive, onReset, onScreenSelect, SettingsScreens.Main);

  return (
    <div className="settings-content custom-scroll">
      <div className="settings-main-menu">
        {currentUser && (
          <ProfileInfo
            userId={currentUser.id}
            forceShowSelf
          />
        )}
        {currentUser && (
          <ChatExtra
            chatOrUserId={currentUser.id}
            forceShowSelf
          />
        )}
        <ListItem
          icon="settings"
          onClick={() => onScreenSelect(SettingsScreens.General)}
        >
          {lang('Telegram.GeneralSettingsViewController')}
        </ListItem>
        <ListItem
          icon="lock"
          onClick={() => onScreenSelect(SettingsScreens.Bridge)}
        >
          {lang('BridgeSettings')}
        </ListItem>
        <ListItem
          icon="unmute"
          onClick={() => onScreenSelect(SettingsScreens.Notifications)}
        >
          {lang('Notifications')}
        </ListItem>
        <ListItem
          icon="lock"
          onClick={() => onScreenSelect(SettingsScreens.Privacy)}
        >
          {lang('PrivacySettings')}
        </ListItem>
        <ListItem
          icon="data"
          onClick={() => onScreenSelect(SettingsScreens.DataStorage)}
        >
          {lang('DataSettings')}
        </ListItem>
        <ListItem
          icon="folder"
          onClick={() => onScreenSelect(SettingsScreens.Folders)}
        >
          {lang('Filters')}
        </ListItem>
        <ListItem
          icon="language"
          onClick={() => onScreenSelect(SettingsScreens.Language)}
        >
          {lang('Language')}
        </ListItem>
      </div>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const { currentUserId, lastSyncTime } = global;

    return {
      currentUser: currentUserId ? selectUser(global, currentUserId) : undefined,
      lastSyncTime,
    };
  },
)(SettingsMain));
