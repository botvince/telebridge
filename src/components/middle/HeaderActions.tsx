import React, {
  FC,
  memo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from '../../lib/teact/teact';
import { getDispatch, withGlobal } from '../../lib/teact/teactn';

import { MessageListType } from '../../global/types';
import { MAIN_THREAD_ID } from '../../api/types';
import { IAnchorPosition, ManagementScreens } from '../../types';

import {
  ARE_CALLS_SUPPORTED, IS_MAC_OS, IS_PWA, IS_SINGLE_COLUMN_LAYOUT,
} from '../../util/environment';
import getKeyFromEvent from '../../util/getKeyFromEvent';
import {
  isChatBasicGroup, isChatChannel, isChatSuperGroup, isUserId,
} from '../../modules/helpers';
import {
  selectChat,
  selectChatBot,
  selectIsUserBlocked,
  selectIsChatBotNotStarted,
  selectIsChatWithSelf,
  selectIsInSelectMode,
  selectIsRightColumnShown,
} from '../../modules/selectors';
import useLang from '../../hooks/useLang';

import Button from '../ui/Button';
import HeaderMenuContainer from './HeaderMenuContainer.async';
import { addBufferStamp, checkBufferStamp, decryptBuffer, encryptBuffer, removeBufferStamp } from '../../modules/helpers/bridgeCrypto';

interface OwnProps {
  chatId: string;
  threadId: number;
  messageListType: MessageListType;
  canExpandActions: boolean;
}

interface StateProps {
  noMenu?: boolean;
  isChannel?: boolean;
  isRightColumnShown?: boolean;
  canStartBot?: boolean;
  canRestartBot?: boolean;
  canSubscribe?: boolean;
  canSearch?: boolean;
  canCall?: boolean;
  canMute?: boolean;
  canViewStatistics?: boolean;
  canLeave?: boolean;
  canEnterVoiceChat?: boolean;
  canCreateVoiceChat?: boolean;
  pendingJoinRequests?: number;
  isBridged?: boolean;
}

// Chrome breaks layout when focusing input during transition
const SEARCH_FOCUS_DELAY_MS = 400;

const HeaderActions: FC<OwnProps & StateProps> = ({
  chatId,
  threadId,
  noMenu,
  isChannel,
  canStartBot,
  canRestartBot,
  canSubscribe,
  canSearch,
  canCall,
  canMute,
  canViewStatistics,
  canLeave,
  canEnterVoiceChat,
  canCreateVoiceChat,
  pendingJoinRequests,
  isRightColumnShown,
  canExpandActions,
  isBridged
}) => {
  const {
    joinChannel,
    sendBotCommand,
    openLocalTextSearch,
    restartBot,
    openCallFallbackConfirm,
    requestNextManagementScreen,
  } = getDispatch();

  const keysync = () => {
    console.log("[BRIDGE] STARTED TEST");
    var buffer = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    var stamped = addBufferStamp(buffer);
    var encrypted = encryptBuffer(stamped, "test");
    var decrypted = decryptBuffer(encrypted, "test");
    var check = checkBufferStamp(decrypted);
    var destamped = removeBufferStamp(decrypted);

    console.log("[BRIDGE] Results:");
    console.log("[BRIDGE] buffer:", buffer);
    console.log("[BRIDGE] stamped:", stamped);
    console.log("[BRIDGE] encrypted:", encrypted);
    console.log("[BRIDGE] decrypted:", decrypted);
    console.log("[BRIDGE] check:", check);
    console.log("[BRIDGE] destamped:", destamped);
}

  // eslint-disable-next-line no-null/no-null
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<IAnchorPosition | undefined>(undefined);

  const handleHeaderMenuOpen = useCallback(() => {
    setIsMenuOpen(true);
    const rect = menuButtonRef.current!.getBoundingClientRect();
    setMenuPosition({ x: rect.right, y: rect.bottom });
  }, []);

  const handleHeaderMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleHeaderMenuHide = useCallback(() => {
    setMenuPosition(undefined);
  }, []);

  const handleSubscribeClick = useCallback(() => {
    joinChannel({ chatId });
  }, [joinChannel, chatId]);

  const handleStartBot = useCallback(() => {
    sendBotCommand({ command: '/start' });
  }, [sendBotCommand]);

  const handleRestartBot = useCallback(() => {
    restartBot({ chatId });
  }, [chatId, restartBot]);

  const handleJoinRequestsClick = useCallback(() => {
    requestNextManagementScreen({ screen: ManagementScreens.JoinRequests });
  }, [requestNextManagementScreen]);

  const handleSearchClick = useCallback(() => {
    openLocalTextSearch();

    if (IS_SINGLE_COLUMN_LAYOUT) {
      // iOS requires synchronous focus on user event.
      const searchInput = document.querySelector<HTMLInputElement>('#MobileSearch input')!;
      searchInput.focus();
    } else {
      setTimeout(() => {
        const searchInput = document.querySelector<HTMLInputElement>('.RightHeader .SearchInput input');
        if (searchInput) {
          searchInput.focus();
        }
      }, SEARCH_FOCUS_DELAY_MS);
    }
  }, [openLocalTextSearch]);

  useEffect(() => {
    if (!canSearch) {
      return undefined;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (
        IS_PWA && ((IS_MAC_OS && e.metaKey) || (!IS_MAC_OS && e.ctrlKey)) && !e.shiftKey && getKeyFromEvent(e) === 'f'
      ) {
        e.preventDefault();
        handleSearchClick();
      }
    }

    document.addEventListener('keydown', handleKeyDown, false);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [canSearch, handleSearchClick]);

  const lang = useLang();

  return (
    <div className="HeaderActions">
      {!IS_SINGLE_COLUMN_LAYOUT && (
        <>
          {canExpandActions && canSubscribe && (
            <Button
              size="tiny"
              ripple
              fluid
              onClick={handleSubscribeClick}
            >
              {lang(isChannel ? 'ProfileJoinChannel' : 'ProfileJoinGroup')}
            </Button>
          )}
          {canExpandActions && canStartBot && (
            <Button
              size="tiny"
              ripple
              fluid
              onClick={handleStartBot}
            >
              {lang('BotStart')}
            </Button>
          )}
          {canExpandActions && canRestartBot && (
            <Button
              size="tiny"
              ripple
              fluid
              onClick={handleRestartBot}
            >
              {lang('BotRestart')}
            </Button>
          )}
          {canSearch && (
            <Button
              round
              ripple={isRightColumnShown}
              color="translucent"
              size="smaller"
              onClick={handleSearchClick}
              ariaLabel="Search in this chat"
            >
              <i className="icon-search" />
            </Button>
          )}
          {canCall && (
            <Button
              round
              color="translucent"
              size="smaller"
              onClick={openCallFallbackConfirm}
              ariaLabel="Call"
            >
              <i className="icon-phone" />
            </Button>
          )}

          <Button
            round
            color="translucent"
            size="smaller"
            onClick={keysync}
            ariaLabel="Keysync"
          >
          {isBridged ? (
            <i className="icon-lock" />
          ) : (
            <i className="icon-unlock" />
          )}
          </Button>
            
        </>
      )}
      {Boolean(pendingJoinRequests) && (
        <Button
          round
          className="badge-button"
          ripple={isRightColumnShown}
          color="translucent"
          size="smaller"
          onClick={handleJoinRequestsClick}
          ariaLabel={isChannel ? lang('SubscribeRequests') : lang('MemberRequests')}
        >
          <i className="icon-user" />
          <div className="badge">{pendingJoinRequests}</div>
        </Button>
      )}
      <Button
        ref={menuButtonRef}
        className={isMenuOpen ? 'active' : ''}
        round
        ripple={!IS_SINGLE_COLUMN_LAYOUT}
        size="smaller"
        color="translucent"
        disabled={noMenu}
        ariaLabel="More actions"
        onClick={handleHeaderMenuOpen}
      >
        <i className="icon-more" />
      </Button>
      {menuPosition && (
        <HeaderMenuContainer
          chatId={chatId}
          threadId={threadId}
          isOpen={isMenuOpen}
          anchor={menuPosition}
          withExtraActions={IS_SINGLE_COLUMN_LAYOUT || !canExpandActions}
          isChannel={isChannel}
          canStartBot={canStartBot}
          canRestartBot={canRestartBot}
          canSubscribe={canSubscribe}
          canSearch={canSearch}
          canCall={canCall}
          canMute={canMute}
          canViewStatistics={canViewStatistics}
          canLeave={canLeave}
          canEnterVoiceChat={canEnterVoiceChat}
          canCreateVoiceChat={canCreateVoiceChat}
          onSubscribeChannel={handleSubscribeClick}
          onSearchClick={handleSearchClick}
          onClose={handleHeaderMenuClose}
          onCloseAnimationEnd={handleHeaderMenuHide}
        />
      )}
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { chatId, threadId, messageListType }): StateProps => {
    const chat = selectChat(global, chatId);
    const isChannel = Boolean(chat && isChatChannel(chat));

    if (!chat || chat.isRestricted || selectIsInSelectMode(global)) {
      return {
        noMenu: true,
      };
    }

    const bot = selectChatBot(global, chatId);
    const isChatWithSelf = selectIsChatWithSelf(global, chatId);
    const isMainThread = messageListType === 'thread' && threadId === MAIN_THREAD_ID;
    const isDiscussionThread = messageListType === 'thread' && threadId !== MAIN_THREAD_ID;
    const isRightColumnShown = selectIsRightColumnShown(global);

    const canRestartBot = Boolean(bot && selectIsUserBlocked(global, bot.id));
    const canStartBot = !canRestartBot && Boolean(selectIsChatBotNotStarted(global, chatId));
    const canSubscribe = Boolean(
      isMainThread && (isChannel || isChatSuperGroup(chat)) && chat.isNotJoined,
    );
    const canSearch = isMainThread || isDiscussionThread;
    const canCall = ARE_CALLS_SUPPORTED && isUserId(chat.id) && !isChatWithSelf && !bot;
    const canMute = isMainThread && !isChatWithSelf && !canSubscribe;
    const canLeave = isMainThread && !canSubscribe;
    const canEnterVoiceChat = ARE_CALLS_SUPPORTED && chat.isCallActive;
    const canCreateVoiceChat = ARE_CALLS_SUPPORTED && !chat.isCallActive
      && (chat.adminRights?.manageCall || (chat.isCreator && isChatBasicGroup(chat)));
    const canViewStatistics = chat.fullInfo?.canViewStatistics;
    const pendingJoinRequests = chat.fullInfo?.requestsPending;

    return {
      noMenu: false,
      isChannel,
      isRightColumnShown,
      canStartBot,
      canRestartBot,
      canSubscribe,
      canSearch,
      canCall,
      canMute,
      canViewStatistics,
      canLeave,
      canEnterVoiceChat,
      canCreateVoiceChat,
      pendingJoinRequests,
    };
  },
)(HeaderActions));
