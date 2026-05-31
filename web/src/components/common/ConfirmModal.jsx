import React from 'react';
import Modal from './Modal';

const VARIANTS = {
  danger: {
    icon: '⚠️',
    btnCls: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: '⚡',
    btnCls: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  },
  default: {
    icon: 'ℹ️',
    btnCls: 'bg-[#0891B2] hover:bg-[#0e7490] text-white',
  },
};

/**
 * ConfirmModal — confirmation dialog with cancel/confirm actions.
 *
 * @param {boolean}  open         - Controls visibility
 * @param {Function} onClose      - Called when cancelled / closed
 * @param {Function} onConfirm    - Called when confirmed
 * @param {string}   title        - Dialog title
 * @param {string}   message      - Confirmation message body
 * @param {string}   confirmLabel - Text for the confirm button (default: 'Confirm')
 * @param {string}   variant      - 'danger' | 'warning' | 'default'
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  variant = 'default',
}) {
  const v = VARIANTS[variant] || VARIANTS.default;

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={
      <>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${v.btnCls}`}
        >
          {confirmLabel}
        </button>
      </>
    }>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{v.icon}</span>
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
