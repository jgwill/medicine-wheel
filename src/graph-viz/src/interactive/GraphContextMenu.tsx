/**
 * @medicine-wheel/graph-viz — Graph context menus
 *
 * Presentational pieces for the node / edge / pane right-click menus:
 * a positioned panel, menu items, and an inline "create node here" form
 * (name + type, direction pre-read from the quadrant the click landed in).
 * State and actions live in `MedicineWheelFlowGraph`.
 */

import React, { useState } from 'react';

import type { DirectionName, NodeType } from '@medicine-wheel/ontology-core';

import { DIRECTION_PRESENTATION } from './DirectionQuadrant.js';

/** Which menu is open, and where (pane-relative CSS px). */
export type GraphMenuState =
  | { kind: 'node'; nodeId: string; x: number; y: number }
  | {
      kind: 'edge';
      edgeId: string;
      x: number;
      y: number;
      confirmRelease?: boolean;
    }
  | {
      kind: 'pane';
      x: number;
      y: number;
      flowX: number;
      flowY: number;
      creating?: boolean;
    };

const NODE_TYPE_OPTIONS: NodeType[] = [
  'human',
  'land',
  'spirit',
  'ancestor',
  'future',
  'knowledge',
];

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  zIndex: 30,
  minWidth: 200,
  padding: 6,
  borderRadius: 10,
  background: 'var(--mw-card, #12122a)',
  border: '1px solid var(--mw-border, rgba(255, 255, 255, 0.12))',
  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.5)',
  fontSize: 13,
  color: 'var(--mw-fg, #e5e7eb)',
};

const itemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '7px 10px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
};

export function GraphContextMenu({
  x,
  y,
  title,
  children,
}: {
  x: number;
  y: number;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mw-context-menu nodrag nopan"
      style={{ ...panelStyle, left: x, top: y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {title && (
        <div
          style={{
            padding: '5px 10px 7px',
            fontSize: 11,
            color: 'var(--mw-muted, #9ca3af)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 240,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function GraphMenuItem({
  label,
  hint,
  onSelect,
  disabled,
  danger,
}: {
  label: React.ReactNode;
  hint?: string;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="mw-context-menu-item"
      style={{
        ...itemStyle,
        color: danger
          ? 'var(--mw-destructive-ink, #f87171)'
          : disabled
            ? 'var(--mw-muted, #9ca3af)'
            : 'inherit',
        cursor: disabled ? 'default' : 'pointer',
      }}
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
    >
      {label}
      {hint && (
        <span
          style={{
            display: 'block',
            fontSize: 10.5,
            color: 'var(--mw-muted, #9ca3af)',
            marginTop: 1,
          }}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

export function GraphMenuDivider() {
  return (
    <div
      style={{
        height: 1,
        margin: '5px 8px',
        background: 'var(--mw-border, rgba(255, 255, 255, 0.1))',
      }}
    />
  );
}

/** Direction badge in the direction's ink. */
export function DirectionBadge({ direction }: { direction: DirectionName }) {
  const ink = DIRECTION_PRESENTATION[direction].ink;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 600,
        color: ink,
        border: `1px solid ${DIRECTION_PRESENTATION[direction].stroke}`,
      }}
    >
      {direction}
    </span>
  );
}

/**
 * Inline "create node here" form. The direction comes from the quadrant
 * the click landed in and travels with the request.
 */
export function CreateNodeInlineForm({
  direction,
  onSubmit,
  onCancel,
}: {
  direction?: DirectionName;
  onSubmit: (values: { name: string; type: NodeType }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<NodeType>('human');

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid var(--mw-border, rgba(255, 255, 255, 0.14))',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'inherit',
    font: 'inherit',
    fontSize: 12.5,
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, type });
  };

  return (
    <div style={{ padding: '4px 10px 8px', display: 'grid', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 11,
          color: 'var(--mw-muted, #9ca3af)',
        }}
      >
        <span>New node</span>
        {direction && <DirectionBadge direction={direction} />}
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Name the being"
        aria-label="Node name"
        style={fieldStyle}
        className="nodrag"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as NodeType)}
        aria-label="Node type"
        style={fieldStyle}
        className="nodrag"
      >
        {NODE_TYPE_OPTIONS.map((t) => (
          <option key={t} value={t} style={{ background: '#101020' }}>
            {t}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="mw-context-menu-item"
          onClick={submit}
          disabled={!name.trim()}
          style={{
            ...itemStyle,
            flex: 1,
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            opacity: name.trim() ? 1 : 0.5,
          }}
        >
          Place node
        </button>
        <button
          type="button"
          className="mw-context-menu-item"
          onClick={onCancel}
          style={{ ...itemStyle, flex: 0, textAlign: 'center' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
