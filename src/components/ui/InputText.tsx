import {
  ChangeEvent, FormEvent, RefObject,
} from 'react';
import React, { FC, memo, useEffect } from '../../lib/teact/teact';

import buildClassName from '../../util/buildClassName';
import useLang from '../../hooks/useLang';
import Button from './Button';
import useFlag from '../../hooks/useFlag';

type OwnProps = {
  ref?: RefObject<HTMLInputElement>;
  id?: string;
  className?: string;
  value?: string;
  label?: string;
  error?: string;
  success?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  password?: boolean;
  inputMode?: 'text' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onInput?: (e: FormEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
};

const InputText: FC<OwnProps> = ({
  ref,
  id,
  className,
  value,
  label,
  error,
  success,
  disabled,
  readOnly,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  password,
  onChange,
  onInput,
  onKeyPress,
  onKeyDown,
  onBlur,
  onPaste,
}) => {
  const lang = useLang();
  const labelText = error || success || label;
  const fullClassName = buildClassName(
    'input-group',
    value && 'touched',
    error ? 'error' : success && 'success',
    disabled && 'disabled',
    readOnly && 'disabled',
    labelText && 'with-label',
    className,
  );
  const [hidden, hide, show] = useFlag();

  useEffect(() => {
    hide()
  }, [hide])

  const toggleHide = () => {
    if(hidden) show()
    else hide()
  }

  return (
    <div className={fullClassName} dir={lang.isRtl ? 'rtl' : undefined}>
      <input
        ref={ref}
        className="form-control"
        type={password && hidden ? "password" : "text"}
        id={id}
        dir="auto"
        value={value || ''}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        readOnly={readOnly}
        onChange={onChange}
        onInput={onInput}
        onKeyPress={onKeyPress}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onPaste={onPaste}
        aria-label={labelText}
      />
      {labelText && (
        <label htmlFor={id}>{labelText}</label>
      )}
      {
        password && (<Button isText className="confirm-dialog-button" onClick={toggleHide}>{hidden?"Show":"Hide"}</Button>)
      }
      </div>
  );
};

export default memo(InputText);
