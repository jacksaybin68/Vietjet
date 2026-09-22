'use client';

import React from 'react';
import UserChat from './UserChat';
import OpenClawAssistant from './OpenClawAssistant';

/**
 * Global mount point for the chat surfaces. Rendered once from the root layout
 * so every page carries them; each widget decides for itself whether the
 * current viewer may see it (UserChat hides on the admin console, the assistant
 * only appears for admins on /quan-tri).
 */
export default function ChatWidgets() {
  return (
    <>
      <UserChat />
      <OpenClawAssistant />
    </>
  );
}
